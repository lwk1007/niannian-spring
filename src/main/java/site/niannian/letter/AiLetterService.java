package site.niannian.letter;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import site.niannian.common.BizException;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 把「一封信」从模板升级为可选的大模型生成。
 *
 * <p>接的是 OpenAI 兼容的 /chat/completions 协议，所以 Ollama、DeepSeek、通义、Kimi 等
 * 只要把 base-url 指过去就能用。未配置（base-url 或 model 为空）时 {@link #available()} 返回
 * false，LetterService 会退回模板写信，功能不受影响。
 */
@Service
public class AiLetterService {

    private static final Logger log = LoggerFactory.getLogger(AiLetterService.class);

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    private final ObjectMapper objectMapper;

    @Value("${niannian.ai.base-url:}")
    private String baseUrl;

    @Value("${niannian.ai.api-key:}")
    private String apiKey;

    @Value("${niannian.ai.model:}")
    private String model;

    @Value("${niannian.ai.timeout-seconds:45}")
    private int timeoutSeconds;

    public AiLetterService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public boolean available() {
        return baseUrl != null && !baseUrl.isBlank() && model != null && !model.isBlank();
    }

    public String generate(String systemPrompt, String userPrompt) {
        if (!available()) throw BizException.badRequest("AI 写信还没有配置");

        String endpoint = baseUrl.replaceAll("/+$", "") + "/chat/completions";

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", model);
        payload.put("messages", List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", userPrompt)));
        payload.put("temperature", 0.85);

        String json;
        try {
            json = objectMapper.writeValueAsString(payload);
        } catch (Exception e) {
            throw BizException.badRequest("请求构造失败");
        }

        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(endpoint))
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8));
        if (apiKey != null && !apiKey.isBlank()) {
            builder.header("Authorization", "Bearer " + apiKey);
        }

        HttpResponse<String> resp;
        try {
            resp = http.send(builder.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw BizException.badRequest("这会儿联系不上它，缓一缓再试");
        } catch (IOException e) {
            log.warn("AI 写信请求失败: {}", e.toString());
            throw BizException.badRequest("这会儿联系不上它，缓一缓再试");
        }

        if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
            log.warn("AI 写信返回 {}: {}", resp.statusCode(), truncate(resp.body(), 300));
            throw BizException.badRequest("没有写成，稍后再试");
        }

        try {
            JsonNode root = objectMapper.readTree(resp.body());
            String content = root.path("choices").path(0).path("message").path("content").asText("");
            if (content == null || content.isBlank()) throw new IllegalStateException("empty content");
            return content.trim();
        } catch (Exception e) {
            log.warn("AI 写信响应解析失败: {}", e.toString());
            throw BizException.badRequest("没有写成，稍后再试");
        }
    }

    private static String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() > max ? s.substring(0, max) : s;
    }
}

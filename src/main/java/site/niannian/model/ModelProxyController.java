package site.niannian.model;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.RandomAccessFile;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.util.Locale;

/**
 * 浏览器端的抠图模型（BiRefNet-lite）文件代理。
 *
 * <p>为什么需要它：transformers.js 取文件元数据时必定带 {@code Range: bytes=0-0}，
 * 而 hf-mirror 对带自定义头的跨域请求在浏览器里一律 {@code net::ERR_FAILED}
 * （curl 能过，浏览器过不了，属于镜像的 CORS 实现问题）；直连 huggingface.co 在国内又是超时。
 * 改成同源代理后：浏览器不发生跨域、Range 由本服务端实现、模型还能落盘缓存只拉一次。
 *
 * <p>只放行 {@link #ALLOW_PREFIX} 下的路径，避免变成任意 URL 的开放代理。
 */
@RestController
public class ModelProxyController {

    private static final Logger log = LoggerFactory.getLogger(ModelProxyController.class);

    private static final String PATH_PREFIX = "/api/model/";
    private static final String UPSTREAM = "https://hf-mirror.com/";
    /** 只放行这几个模型仓库，防止被当成开放代理。 */
    private static final java.util.List<String> ALLOW_PREFIXES = java.util.List.of(
            "onnx-community/BiRefNet_lite-ONNX/",
            "briaai/RMBG-1.4/");

    private final Path cacheRoot;
    private final HttpClient http;

    public ModelProxyController(
            @Value("${niannian.model-cache-dir:./data/model-cache}") String cacheDir) throws IOException {
        this.cacheRoot = Paths.get(cacheDir).toAbsolutePath().normalize();
        Files.createDirectories(cacheRoot);
        this.http = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.NORMAL)
                .connectTimeout(Duration.ofSeconds(20))
                .build();
    }

    @GetMapping("/api/model/**")
    public void proxy(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String uri = req.getRequestURI();
        String path = uri.length() > PATH_PREFIX.length() ? uri.substring(PATH_PREFIX.length()) : "";
        if (!ALLOW_PREFIXES.stream().anyMatch(path::startsWith) || path.contains("..")) {
            resp.sendError(HttpServletResponse.SC_NOT_FOUND, "只有抠图模型可以走这里");
            return;
        }

        Path local = cacheRoot.resolve(path).normalize();
        if (!local.startsWith(cacheRoot)) {
            resp.sendError(HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        // 已经完整落盘的直接本地读，支持 Range，后续访问不再占用外网带宽
        if (Files.isRegularFile(local) && Files.size(local) > 0) {
            serveLocal(local, req, resp);
            return;
        }

        fetchUpstream(path, local, req, resp);
    }

    /* ---------------- 本地缓存 ---------------- */

    private void serveLocal(Path file, HttpServletRequest req, HttpServletResponse resp) throws IOException {
        long size = Files.size(file);
        resp.setHeader("Accept-Ranges", "bytes");
        resp.setContentType(contentType(file.getFileName().toString()));
        resp.setHeader("Cache-Control", "public, max-age=604800");

        long start = 0;
        long end = size - 1;
        String range = req.getHeader("Range");
        if (range != null && range.startsWith("bytes=")) {
            long[] r = parseRange(range, size);
            if (r == null) {
                resp.setStatus(HttpServletResponse.SC_REQUESTED_RANGE_NOT_SATISFIABLE);
                resp.setHeader("Content-Range", "bytes */" + size);
                return;
            }
            start = r[0];
            end = r[1];
            resp.setStatus(HttpServletResponse.SC_PARTIAL_CONTENT);
            resp.setHeader("Content-Range", "bytes " + start + "-" + end + "/" + size);
        }

        long len = end - start + 1;
        resp.setContentLengthLong(len);
        try (RandomAccessFile raf = new RandomAccessFile(file.toFile(), "r")) {
            raf.seek(start);
            OutputStream out = resp.getOutputStream();
            byte[] buf = new byte[64 * 1024];
            long left = len;
            while (left > 0) {
                int n = raf.read(buf, 0, (int) Math.min(buf.length, left));
                if (n < 0) break;
                out.write(buf, 0, n);
                left -= n;
            }
            out.flush();
        } catch (IOException e) {
            log.debug("模型文件下发中断（浏览器取消）: {}", file.getFileName());
        }
    }

    private static long[] parseRange(String header, long size) {
        // 只支持单段：bytes=start-end / bytes=start- / bytes=-suffix
        String spec = header.substring(6).split(",")[0].trim();
        int dash = spec.indexOf('-');
        if (dash < 0) return null;
        String a = spec.substring(0, dash).trim();
        String b = spec.substring(dash + 1).trim();
        try {
            long start;
            long end;
            if (a.isEmpty()) {
                long suffix = Long.parseLong(b);
                if (suffix <= 0) return null;
                start = Math.max(0, size - suffix);
                end = size - 1;
            } else {
                start = Long.parseLong(a);
                end = b.isEmpty() ? size - 1 : Math.min(size - 1, Long.parseLong(b));
            }
            if (start > end || start >= size) return null;
            return new long[]{start, end};
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /* ---------------- 回源 ---------------- */

    private void fetchUpstream(String path, Path local, HttpServletRequest req, HttpServletResponse resp)
            throws IOException {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(UPSTREAM + path))
                .timeout(Duration.ofMinutes(10))
                .GET();
        String range = req.getHeader("Range");
        if (range != null) builder.header("Range", range);

        HttpResponse<InputStream> up;
        try {
            up = http.send(builder.build(), HttpResponse.BodyHandlers.ofInputStream());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            resp.sendError(HttpServletResponse.SC_BAD_GATEWAY, "模型源不可达");
            return;
        } catch (IOException e) {
            log.warn("拉取模型失败 {}: {}", path, e.toString());
            resp.sendError(HttpServletResponse.SC_BAD_GATEWAY, "模型源不可达");
            return;
        }

        int code = up.statusCode();
        try (InputStream in = up.body()) {
            if (code < 200 || code >= 300) {
                log.warn("模型源返回 {} ({})", code, path);
                resp.sendError(code == 404 ? 404 : HttpServletResponse.SC_BAD_GATEWAY, "模型源返回 " + code);
                return;
            }

            resp.setStatus(code);
            resp.setContentType(contentType(path));
            copyHeader(up, resp, "content-length");
            copyHeader(up, resp, "content-range");
            if (up.headers().firstValue("accept-ranges").isPresent()) {
                resp.setHeader("Accept-Ranges", "bytes");
            }
            resp.setHeader("Cache-Control", "public, max-age=604800");

            OutputStream out = resp.getOutputStream();
            // 上游忽略 Range 直接给整包（200）时顺手落盘，下次就不用再回源
            boolean cacheable = code == HttpServletResponse.SC_OK;
            Path tmp = null;
            FileOutputStream fos = null;
            if (cacheable) {
                Files.createDirectories(local.getParent());
                tmp = local.resolveSibling(local.getFileName() + ".part");
                fos = new FileOutputStream(tmp.toFile());
            }
            long total = 0;
            try {
                byte[] buf = new byte[64 * 1024];
                int n;
                while ((n = in.read(buf)) > 0) {
                    total += n;
                    try {
                        out.write(buf, 0, n);
                    } catch (IOException clientGone) {
                        // 浏览器取消（比如只是想探元数据）就停止下发，但继续把文件存完
                        out = OutputStream.nullOutputStream();
                    }
                    if (fos != null) fos.write(buf, 0, n);
                }
                out.flush();
            } finally {
                if (fos != null) {
                    fos.close();
                    Files.move(tmp, local, StandardCopyOption.REPLACE_EXISTING);
                    log.info("模型文件已缓存 {} ({} bytes)", local.getFileName(), total);
                }
            }
        }
    }

    private static void copyHeader(HttpResponse<?> up, HttpServletResponse resp, String name) {
        up.headers().firstValue(name).ifPresent(v -> resp.setHeader(canonical(name), v));
    }

    private static String canonical(String lower) {
        return switch (lower) {
            case "content-length" -> "Content-Length";
            case "content-range" -> "Content-Range";
            default -> lower;
        };
    }

    private static String contentType(String name) {
        String n = name.toLowerCase(Locale.ROOT);
        if (n.endsWith(".json")) return "application/json";
        if (n.endsWith(".onnx") || n.endsWith(".bin")) return "application/octet-stream";
        if (n.endsWith(".txt")) return "text/plain;charset=utf-8";
        return "application/octet-stream";
    }
}

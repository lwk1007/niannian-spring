package site.niannian.me;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.Map;

@RestController
public class HealthController {

    @GetMapping("/api/health")
    public Map<String, Object> health() {
        return Map.of(
                "ok", true,
                "app", "niannian-server",
                "time", OffsetDateTime.now().toString()
        );
    }
}

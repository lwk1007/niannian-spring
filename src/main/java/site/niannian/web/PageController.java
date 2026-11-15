package site.niannian.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/** 静态页入口映射：app.html 是单页应用壳，路由在浏览器端（#/letter 之类）。 */
@Controller
public class PageController {

    @GetMapping("/app")
    public String appRoot() {
        // 统一带尾斜杠，让前端 history 路由的 base("/app/") 正确解析
        return "redirect:/app/";
    }

    @GetMapping({"/app/", "/app/**"})
    public String app() {
        return "forward:/app.html";
    }
}

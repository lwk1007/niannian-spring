package site.niannian;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("site.niannian")
public class NiannianApplication {

    public static void main(String[] args) {
        SpringApplication.run(NiannianApplication.class, args);
    }
}

package site.niannian.content;

import java.util.List;

/**
 * 人格、物种、心情、称呼的目录常量（由 Node 版 lib/content.js 迁移而来）。
 * 只放"选项"，不放文案正文；正文模板在 P3 随信件功能一起迁移。
 */
public final class ContentCatalog {

    private ContentCatalog() {
    }

    public record Persona(String key, String label, String word) {
    }

    public record PetType(String key, String label) {
    }

    public record Mood(String key, String label, String color) {
    }

    public static final List<Persona> PERSONAS = List.of(
            new Persona("loyal", "忠实", "它总在你回家的方向等"),
            new Persona("lively", "活泼", "它把每一天都过成节日"),
            new Persona("foodie", "贪吃", "它用鼻子记住整个世界"),
            new Persona("friendly", "亲人", "它见谁都像见老朋友")
    );

    public static final List<PetType> TYPES = List.of(
            new PetType("cat", "猫"),
            new PetType("dog", "狗"),
            new PetType("other", "其他")
    );

    public static final List<Mood> MOODS = List.of(
            new Mood("calm", "还算平静", "#9FB08A"),
            new Mood("miss", "很想它", "#E4A57B"),
            new Mood("heavy", "沉得说不出话", "#8A7A9B"),
            new Mood("warm", "想起就笑了", "#E8C77A"),
            new Mood("empty", "少了点什么", "#B9AE9C")
    );

    public static final List<String> OWNER_TITLES = List.of(
            "主人", "妈妈", "爸爸", "铲屎官", "老朋友", "家人"
    );

    public static boolean hasPersona(String key) {
        return PERSONAS.stream().anyMatch(p -> p.key().equals(key));
    }

    public static boolean hasType(String key) {
        return TYPES.stream().anyMatch(t -> t.key().equals(key));
    }

    public static boolean hasMood(String key) {
        return MOODS.stream().anyMatch(m -> m.key().equals(key));
    }
}

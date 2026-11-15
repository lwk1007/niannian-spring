package site.niannian.me;

import site.niannian.content.ContentCatalog;
import site.niannian.pet.PetView;

import java.util.List;

/** 对应 Node 版 GET /api/me 的响应结构，前端拿一次就能渲染整页。 */
public record MeView(
        String uid,
        boolean hasPet,
        PetView pet,
        Counts counts,
        Options options
) {

    public record Counts(int moods, int letters, int tributes, int capsules) {
    }

    public record Options(
            List<ContentCatalog.Persona> personas,
            List<ContentCatalog.PetType> types,
            List<ContentCatalog.Mood> moods,
            List<String> titles
    ) {
    }
}

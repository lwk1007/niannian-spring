package site.niannian.pet;

/** 领养表单的入参。字段可缺省，缺省时沿用已有值或默认值。 */
public record PetRequest(
        String name,
        String type,
        String personality,
        String ownerTitle,
        String sinceDate,
        String photo,
        String cutout,
        String storageMode,
        String traits
) {
}

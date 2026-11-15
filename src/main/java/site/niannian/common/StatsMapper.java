package site.niannian.common;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

/** 首页/我的页需要的各模块条数，一次查完，避免前端拼多个请求。 */
@Mapper
public interface StatsMapper {

    @Select("SELECT COUNT(*) FROM moods WHERE user_id = #{userId}")
    int countMoods(@Param("userId") Long userId);

    @Select("SELECT COUNT(*) FROM letters WHERE user_id = #{userId}")
    int countLetters(@Param("userId") Long userId);

    @Select("SELECT COUNT(*) FROM tributes WHERE user_id = #{userId}")
    int countTributes(@Param("userId") Long userId);

    @Select("SELECT COUNT(*) FROM capsules WHERE user_id = #{userId}")
    int countCapsules(@Param("userId") Long userId);
}

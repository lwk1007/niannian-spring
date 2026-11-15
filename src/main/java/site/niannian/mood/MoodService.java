package site.niannian.mood;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.stereotype.Service;
import site.niannian.common.BizException;
import site.niannian.content.ContentCatalog;
import site.niannian.pet.PetService;
import site.niannian.pet.PetService;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class MoodService {

    private final MoodMapper moodMapper;
    private final PetService petService;

    public MoodService(MoodMapper moodMapper, PetService petService) {
        this.moodMapper = moodMapper;
        this.petService = petService;
    }

    public List<Mood> list(Long userId) {
        if (userId == null) return List.of();
        return moodMapper.selectList(new LambdaQueryWrapper<Mood>()
                .eq(Mood::getUserId, userId)
                .orderByDesc(Mood::getCreatedAt));
    }

    public int count(Long userId) {
        return Math.toIntExact(moodMapper.selectCount(
                new LambdaQueryWrapper<Mood>().eq(Mood::getUserId, userId)));
    }

    /** 沉得说不出话的天数：写信时会用到。 */
    public int heavyCount(Long userId) {
        return Math.toIntExact(moodMapper.selectCount(new LambdaQueryWrapper<Mood>()
                .eq(Mood::getUserId, userId)
                .in(Mood::getMood, List.of("miss", "heavy"))));
    }

    public Mood create(Long userId, String moodKey, String note) {
        petService.require(userId);
        String key = ContentCatalog.hasMood(moodKey) ? moodKey : "calm";
        Mood m = new Mood();
        m.setUserId(userId);
        m.setMood(key);
        m.setNote(PetService.trim(note, 300));
        m.setCreatedAt(LocalDateTime.now());
        moodMapper.insert(m);
        return m;
    }
}

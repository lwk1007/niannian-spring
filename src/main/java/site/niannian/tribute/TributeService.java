package site.niannian.tribute;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import site.niannian.common.BizException;
import site.niannian.pet.Pet;
import site.niannian.pet.PetService;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class TributeService {

    private final TributeMapper tributeMapper;
    private final PetService petService;

    public TributeService(TributeMapper tributeMapper, PetService petService) {
        this.tributeMapper = tributeMapper;
        this.petService = petService;
    }

    public List<Tribute> listDesc(Long userId) {
        if (userId == null) return List.of();
        return tributeMapper.selectList(new LambdaQueryWrapper<Tribute>()
                .eq(Tribute::getUserId, userId)
                .orderByDesc(Tribute::getCreatedAt));
    }

    public List<Tribute> recent(Long userId, int limit) {
        if (userId == null) return List.of();
        return tributeMapper.selectList(new LambdaQueryWrapper<Tribute>()
                .eq(Tribute::getUserId, userId)
                .orderByDesc(Tribute::getCreatedAt)
                .last("LIMIT " + limit));
    }

    public int count(Long userId) {
        return Math.toIntExact(tributeMapper.selectCount(
                new LambdaQueryWrapper<Tribute>().eq(Tribute::getUserId, userId)));
    }

    /** 写一封思念信，同时点亮一支灯。计数走 pets.lit，不依赖每次都 count 全表。 */
    @Transactional
    public Tribute create(Long userId, String content) {
        petService.require(userId);
        String text = PetService.trim(content, 2000);
        if (text.isEmpty()) throw BizException.badRequest("写点什么吧，一句也好");

        Tribute t = new Tribute();
        t.setUserId(userId);
        t.setContent(text);
        t.setCreatedAt(LocalDateTime.now());
        tributeMapper.insert(t);

        petService.touchLit(userId, 1);
        return t;
    }

    public int lit(Long userId) {
        Pet pet = petService.findByUserId(userId);
        return pet == null ? 0 : pet.getLit();
    }
}

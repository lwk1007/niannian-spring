package site.niannian.capsule;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.stereotype.Service;
import site.niannian.common.BizException;
import site.niannian.common.Time;
import site.niannian.pet.PetService;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class CapsuleService {

    private final CapsuleMapper capsuleMapper;
    private final PetService petService;

    public CapsuleService(CapsuleMapper capsuleMapper, PetService petService) {
        this.capsuleMapper = capsuleMapper;
        this.petService = petService;
    }

    /** 未到期时 content 直接抹成 null —— 私密性靠接口保证，不靠前端隐藏。 */
    public record CapsuleView(Long id, long createdAt, long unlockAt, boolean locked,
                              String content, Long openedAt) {
    }

    private CapsuleView view(Capsule c) {
        boolean locked = c.getOpenAt() != null && c.getOpenAt().isAfter(LocalDateTime.now());
        Long openedAt = c.getOpenedAt() == null ? null : Time.millis(c.getOpenedAt());
        return new CapsuleView(c.getId(), Time.millis(c.getCreatedAt()), Time.millis(c.getOpenAt()),
                locked, locked ? null : c.getContent(), openedAt);
    }

    public List<CapsuleView> list(Long userId) {
        if (userId == null) return List.of();
        return capsuleMapper.selectList(new LambdaQueryWrapper<Capsule>()
                        .eq(Capsule::getUserId, userId)
                        .orderByDesc(Capsule::getCreatedAt))
                .stream().map(this::view).toList();
    }

    public int count(Long userId) {
        return Math.toIntExact(capsuleMapper.selectCount(
                new LambdaQueryWrapper<Capsule>().eq(Capsule::getUserId, userId)));
    }

    public CapsuleView create(Long userId, String content, Integer days) {
        petService.require(userId);
        String text = PetService.trim(content, 3000);
        if (text.isEmpty()) throw BizException.badRequest("还没写内容");

        int d = days == null ? 30 : days;
        d = Math.min(3650, Math.max(1, d));

        Capsule c = new Capsule();
        c.setUserId(userId);
        c.setContent(text);
        c.setOpenAt(LocalDateTime.now().plusDays(d));
        c.setOpened(0);
        c.setCreatedAt(LocalDateTime.now());
        capsuleMapper.insert(c);
        return view(c);
    }

    public CapsuleView open(Long userId, Long id) {
        Capsule c = capsuleMapper.selectOne(new LambdaQueryWrapper<Capsule>()
                .eq(Capsule::getId, id)
                .eq(Capsule::getUserId, userId));
        if (c == null) throw BizException.notFound("这颗胶囊");
        if (c.getOpenAt() != null && c.getOpenAt().isAfter(LocalDateTime.now())) {
            throw BizException.forbidden("还没到打开的时候");
        }
        if (c.getOpened() == 0) {
            c.setOpened(1);
            c.setOpenedAt(LocalDateTime.now());
            capsuleMapper.updateById(c);
        }
        return view(c);
    }
}

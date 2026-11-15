package site.niannian.visitor;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import site.niannian.common.BizException;
import site.niannian.pet.PetService;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class VisitorTributeService {

    private final VisitorTributeMapper mapper;

    public VisitorTributeService(VisitorTributeMapper mapper) {
        this.mapper = mapper;
    }

    /** 公开可见的留言（已通过），按时间倒序。 */
    public List<VisitorTribute> approvedMessages(Long userId) {
        if (userId == null) return List.of();
        return mapper.selectList(new LambdaQueryWrapper<VisitorTribute>()
                .eq(VisitorTribute::getUserId, userId)
                .eq(VisitorTribute::getKind, VisitorTribute.KIND_MESSAGE)
                .eq(VisitorTribute::getStatus, VisitorTribute.STATUS_APPROVED)
                .orderByDesc(VisitorTribute::getCreatedAt));
    }

    /** 已通过的某类互动总数（献花/点灯）。 */
    public long countKind(Long userId, String kind) {
        if (userId == null) return 0;
        return mapper.selectCount(new LambdaQueryWrapper<VisitorTribute>()
                .eq(VisitorTribute::getUserId, userId)
                .eq(VisitorTribute::getKind, kind)
                .eq(VisitorTribute::getStatus, VisitorTribute.STATUS_APPROVED));
    }

    /** 主人侧：全部访客互动（含待审核），按时间倒序。 */
    public List<VisitorTribute> listAll(Long userId) {
        if (userId == null) return List.of();
        return mapper.selectList(new LambdaQueryWrapper<VisitorTribute>()
                .eq(VisitorTribute::getUserId, userId)
                .orderByDesc(VisitorTribute::getCreatedAt));
    }

    public long pendingCount(Long userId) {
        if (userId == null) return 0;
        return mapper.selectCount(new LambdaQueryWrapper<VisitorTribute>()
                .eq(VisitorTribute::getUserId, userId)
                .eq(VisitorTribute::getStatus, VisitorTribute.STATUS_PENDING));
    }

    /**
     * 访客留下一笔：留言 / 献花 / 点灯。
     * 留言在主人开启「需审核」时进入待审核；献花与点灯这类纯仪式动作即时生效。
     */
    @Transactional
    public VisitorTribute add(Long userId, String kind, String content, String name, boolean moderate) {
        String k = switch (kind == null ? "" : kind) {
            case "flower" -> VisitorTribute.KIND_FLOWER;
            case "candle" -> VisitorTribute.KIND_CANDLE;
            default -> VisitorTribute.KIND_MESSAGE;
        };

        VisitorTribute t = new VisitorTribute();
        t.setUserId(userId);
        t.setKind(k);
        t.setName(PetService.trim(name, 40));

        if (VisitorTribute.KIND_MESSAGE.equals(k)) {
            String c = PetService.trim(content, 1000);
            if (c.isEmpty()) throw BizException.badRequest("说点什么吧，一句也好");
            t.setContent(c);
            t.setStatus(moderate ? VisitorTribute.STATUS_PENDING : VisitorTribute.STATUS_APPROVED);
        } else {
            t.setContent(null);
            t.setStatus(VisitorTribute.STATUS_APPROVED);
        }

        t.setCreatedAt(LocalDateTime.now());
        mapper.insert(t);
        return t;
    }

    @Transactional
    public void setStatus(Long userId, Long id, int status) {
        VisitorTribute t = mapper.selectById(id);
        if (t == null || !t.getUserId().equals(userId)) throw BizException.badRequest("没有这条记录");
        t.setStatus(status);
        mapper.updateById(t);
    }

    @Transactional
    public void delete(Long userId, Long id) {
        VisitorTribute t = mapper.selectById(id);
        if (t == null || !t.getUserId().equals(userId)) throw BizException.badRequest("没有这条记录");
        mapper.deleteById(id);
    }

    /** 一键抹掉：连同宠物一起清空访客互动。 */
    public void deleteAllByUser(Long userId) {
        if (userId == null) return;
        mapper.delete(new LambdaQueryWrapper<VisitorTribute>().eq(VisitorTribute::getUserId, userId));
    }
}

package site.niannian.share;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import site.niannian.common.BizException;
import site.niannian.content.ContentCatalog;
import site.niannian.pet.Pet;
import site.niannian.pet.PetService;
import site.niannian.timeline.TimelineItem;
import site.niannian.timeline.TimelineService;
import site.niannian.tribute.Tribute;
import site.niannian.tribute.TributeService;
import site.niannian.visitor.VisitorTribute;
import site.niannian.visitor.VisitorTributeService;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;

@Service
public class ShareService {

    /** 公开页默认只放"相遇/足迹/里程碑"这类事实，心情、信、思念信要主人主动勾选才出现。 */
    private static final Set<String> PRIVATE_TYPES = Set.of("mood", "letter", "tribute", "capsule");
    private static final int TIMELINE_LIMIT = 30;

    private final ShareMapper shareMapper;
    private final PetService petService;
    private final TimelineService timelineService;
    private final TributeService tributeService;
    private final VisitorTributeService visitorTributeService;
    private final SecureRandom random = new SecureRandom();

    public ShareService(ShareMapper shareMapper, PetService petService,
                        TimelineService timelineService, TributeService tributeService,
                        VisitorTributeService visitorTributeService) {
        this.shareMapper = shareMapper;
        this.petService = petService;
        this.timelineService = timelineService;
        this.tributeService = tributeService;
        this.visitorTributeService = visitorTributeService;
    }

    public Share findByUserId(Long userId) {
        if (userId == null) return null;
        return shareMapper.selectOne(new LambdaQueryWrapper<Share>()
                .eq(Share::getUserId, userId)
                .last("LIMIT 1"));
    }

    public Share findByCode(String code) {
        if (code == null || code.isBlank()) return null;
        return shareMapper.selectOne(new LambdaQueryWrapper<Share>().eq(Share::getShareCode, code));
    }

    /** 开分享：已经开过就只更新"是否公开私密内容"，分享码保持不变，已发出去的链接不失效。 */
    @Transactional
    public Share getOrCreate(Long userId, boolean includePrivate) {
        petService.require(userId);
        Share share = findByUserId(userId);
        if (share == null) {
            share = new Share();
            share.setUserId(userId);
            share.setShareCode(newCode());
            share.setIncludePrivate(includePrivate ? 1 : 0);
            share.setAllowGuest(1);
            share.setModerate(0);
            share.setCreatedAt(LocalDateTime.now());
            shareMapper.insert(share);
        } else {
            share.setIncludePrivate(includePrivate ? 1 : 0);
            shareMapper.updateById(share);
        }
        return share;
    }

    /** 设置访客互动开关：是否允许留言/献花，留言是否需审核。 */
    @Transactional
    public void setGuest(Long userId, boolean allowGuest, boolean moderate) {
        Share share = findByUserId(userId);
        if (share == null) return;
        share.setAllowGuest(allowGuest ? 1 : 0);
        share.setModerate(moderate ? 1 : 0);
        shareMapper.updateById(share);
    }

    @Transactional
    public void disable(Long userId) {
        Share share = findByUserId(userId);
        if (share != null) shareMapper.deleteById(share.getId());
    }

    /** 12 位十六进制，够短可以口头念、也够难被猜到。 */
    private String newCode() {
        byte[] buf = new byte[6];
        random.nextBytes(buf);
        return HexFormat.of().formatHex(buf);
    }

    /* ---------------- 公开数据 ---------------- */

    public PublicView publicView(Share share) {
        if (share == null) return null;
        Pet pet = petService.findByUserId(share.getUserId());
        if (pet == null) return null;

        boolean includePrivate = share.getIncludePrivate() == 1;

        List<TimelineItem> timeline = timelineService.build(share.getUserId()).stream()
                .filter(i -> includePrivate || !PRIVATE_TYPES.contains(i.type()))
                .limit(TIMELINE_LIMIT)
                .toList();

        // 思念信正文默认不外泄，只有主人勾了"公开"才出现；点灯数一直显示
        List<PublicView.TributePublic> tributes = includePrivate
                ? tributeService.recent(share.getUserId(), 5).stream()
                .map(t -> new PublicView.TributePublic(t.getContent(),
                        site.niannian.common.Time.millis(t.getCreatedAt())))
                .toList()
                : List.<PublicView.TributePublic>of();

        String label = ContentCatalog.PERSONAS.stream()
                .filter(p -> p.key().equals(pet.getPersonality()))
                .map(ContentCatalog.Persona::label)
                .findFirst().orElse("亲人");

        // 私密模式：照片只在主人自己的空间显示，公开页回退到手绘图；只有「长期保存」才公开照片
        String publicPhoto = "persistent".equals(pet.getStorageMode()) ? pet.getPhoto() : null;

        PublicView.PetPublic pv = new PublicView.PetPublic(
                pet.getName(), pet.getType(), pet.getPersonality(), label,
                pet.getSinceDate(), publicPhoto, pet.getOwnerTitle());

        List<PublicView.GuestMessage> messages = visitorTributeService.approvedMessages(share.getUserId())
                .stream()
                .map(m -> new PublicView.GuestMessage(m.getName(), m.getContent(),
                        site.niannian.common.Time.millis(m.getCreatedAt())))
                .toList();

        return new PublicView(pv, petService.days(pet), tributeService.count(share.getUserId()),
                tributes, timeline,
                (int) visitorTributeService.countKind(share.getUserId(), VisitorTribute.KIND_FLOWER),
                (int) visitorTributeService.countKind(share.getUserId(), VisitorTribute.KIND_CANDLE),
                messages,
                share.getAllowGuest() == 1,
                share.getModerate() == 1);
    }

    public PublicView publicViewByCode(String code) {
        return publicView(findByCode(code));
    }
}

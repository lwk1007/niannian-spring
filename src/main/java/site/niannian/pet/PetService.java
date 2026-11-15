package site.niannian.pet;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import site.niannian.capsule.CapsuleMapper;
import site.niannian.capsule.Capsule;
import site.niannian.common.BizException;
import site.niannian.content.ContentCatalog;
import site.niannian.content.ContentText;
import site.niannian.event.EventService;
import site.niannian.letter.Letter;
import site.niannian.letter.LetterMapper;
import site.niannian.mood.Mood;
import site.niannian.mood.MoodMapper;
import site.niannian.photo.Photo;
import site.niannian.photo.PhotoMapper;
import site.niannian.share.Share;
import site.niannian.share.ShareMapper;
import site.niannian.stat.InteractionLog;
import site.niannian.stat.InteractionLogMapper;
import site.niannian.tribute.Tribute;
import site.niannian.tribute.TributeMapper;
import site.niannian.visitor.VisitorTribute;
import site.niannian.visitor.VisitorTributeMapper;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
public class PetService {

    private final PetMapper petMapper;
    private final EventService eventService;
    private final ShareMapper shareMapper;
    private final MoodMapper moodMapper;
    private final LetterMapper letterMapper;
    private final TributeMapper tributeMapper;
    private final CapsuleMapper capsuleMapper;
    private final PhotoMapper photoMapper;
    private final VisitorTributeMapper visitorTributeMapper;
    private final InteractionLogMapper interactionLogMapper;

    public PetService(PetMapper petMapper,
                      EventService eventService,
                      ShareMapper shareMapper,
                      MoodMapper moodMapper,
                      LetterMapper letterMapper,
                      TributeMapper tributeMapper,
                      CapsuleMapper capsuleMapper,
                      PhotoMapper photoMapper,
                      VisitorTributeMapper visitorTributeMapper,
                      InteractionLogMapper interactionLogMapper) {
        this.petMapper = petMapper;
        this.eventService = eventService;
        this.shareMapper = shareMapper;
        this.moodMapper = moodMapper;
        this.letterMapper = letterMapper;
        this.tributeMapper = tributeMapper;
        this.capsuleMapper = capsuleMapper;
        this.photoMapper = photoMapper;
        this.visitorTributeMapper = visitorTributeMapper;
        this.interactionLogMapper = interactionLogMapper;
    }

    /* ---------------- 查询 ---------------- */

    /** 一人一宠：user_id 上有唯一索引。 */
    public Pet findByUserId(Long userId) {
        if (userId == null) return null;
        return petMapper.selectOne(new LambdaQueryWrapper<Pet>().eq(Pet::getUserId, userId));
    }

    public Pet require(Long userId) {
        Pet pet = findByUserId(userId);
        if (pet == null) throw BizException.badRequest("还没有领养");
        return pet;
    }

    public int days(Pet pet) {
        return ContentText.daysSince(pet.getSinceDate(), LocalDate.now());
    }

    public PetView view(Pet pet) {
        if (pet == null) return null;
        Share share = shareMapper.selectOne(new LambdaQueryWrapper<Share>()
                .eq(Share::getUserId, pet.getUserId())
                .last("LIMIT 1"));
        PetView.Stats stats = new PetView.Stats(pet.getStatTouch(), pet.getStatFeed(), pet.getStatPlay());
        return new PetView(
                pet.getId(),
                pet.getName(),
                pet.getType(),
                pet.getPersonality(),
                pet.getOwnerTitle(),
                pet.getTraits(),
                pet.getSinceDate(),
                pet.getPhoto(),
                pet.getCutout(),
                pet.getStorageMode(),
                days(pet),
                stats,
                Intimacy.of(stats),
                share == null ? null : share.getShareCode(),
                share != null && share.getIncludePrivate() == 1,
                share == null || share.getAllowGuest() == 1,
                share != null && share.getModerate() == 1,
                Plant.of(pet.getPlantWatered(), pet.getPlantLastWatered(), LocalDate.now())
        );
    }

    /* ---------------- 领养 / 修改 ---------------- */

    @Transactional
    public Pet upsert(Long userId, PetRequest req) {
        String name = trim(req.name(), 20);
        if (name.isEmpty()) throw BizException.badRequest("给它一个名字吧");

        Pet existing = findByUserId(userId);
        boolean isNew = existing == null;
        Pet pet = isNew ? new Pet() : existing;

        String photo = photoOk(req.photo());
        String cutout = photoOk(req.cutout());

        if (isNew) {
            pet.setUserId(userId);
            pet.setStatTouch(0);
            pet.setStatFeed(0);
            pet.setStatPlay(0);
            pet.setLit(0);
            pet.setCreatedAt(LocalDateTime.now());
        }

        pet.setName(name);
        pet.setType(ContentCatalog.hasType(req.type()) ? req.type() : "cat");
        pet.setPersonality(ContentCatalog.hasPersona(req.personality()) ? req.personality() : "friendly");
        pet.setOwnerTitle(trim(req.ownerTitle(), 12).isEmpty() ? "主人" : trim(req.ownerTitle(), 12));
        pet.setTraits(trim(req.traits(), 60));
        pet.setSinceDate(parseDate(req.sinceDate()));
        pet.setStorageMode("persistent".equals(req.storageMode()) ? "persistent" : "private");
        if (!photo.isEmpty()) pet.setPhoto(photo);
        if (!cutout.isEmpty()) pet.setCutout(cutout);
        pet.setUpdatedAt(LocalDateTime.now());

        if (isNew) {
            petMapper.insert(pet);
            eventService.record(userId, "meet", "相遇",
                    pet.getOwnerTitle() + " 与 " + pet.getName() + " 的故事从这里开始。");
        } else {
            petMapper.updateById(pet);
            // 换照片只在私密存储模式下才有"旧照片进清理队列"这件事
            if (!photo.isEmpty() && existing.getPhoto() != null
                    && !photo.equals(existing.getPhoto()) && "private".equals(existing.getStorageMode())) {
                eventService.record(userId, "photo", "换了照片", "旧照片进入清理队列。");
            }
        }
        return pet;
    }

    /* ---------------- 互动 ---------------- */

    public record Interaction(String line, PetView.Stats stats, Intimacy intimacy, boolean levelUp) {
    }

    @Transactional
    public Interaction interact(Long userId, String rawAction) {
        Pet pet = require(userId);
        String action = switch (rawAction == null ? "" : rawAction) {
            case "feed", "play", "touch" -> rawAction;
            default -> "touch";
        };
        int levelBefore = Intimacy.levelOf(Intimacy.xpOf(
                new PetView.Stats(pet.getStatTouch(), pet.getStatFeed(), pet.getStatPlay())));
        switch (action) {
            case "feed" -> pet.setStatFeed(pet.getStatFeed() + 1);
            case "play" -> pet.setStatPlay(pet.getStatPlay() + 1);
            default -> pet.setStatTouch(pet.getStatTouch() + 1);
        }
        pet.setLastSeen(LocalDateTime.now());
        petMapper.updateById(pet);

        // 落一条互动明细，供「陪伴数据」画热力图与亲密度曲线
        InteractionLog log = new InteractionLog();
        log.setUserId(userId);
        log.setAction(action);
        log.setCreatedAt(LocalDateTime.now());
        interactionLogMapper.insert(log);

        eventService.recordFootprintOncePerDay(userId, LocalDate.now());

        PetView.Stats stats = new PetView.Stats(pet.getStatTouch(), pet.getStatFeed(), pet.getStatPlay());
        Intimacy intimacy = Intimacy.of(stats);
        // 跨级才记一条，避免时间轴被每一下互动刷满
        if (intimacy.level() > levelBefore) {
            eventService.record(userId, "intimacy",
                    "亲密度 " + intimacy.level() + " 级 · " + intimacy.title(),
                    intimacy.milestoneText());
        }
        String line = ContentText.interactionLine(pet.getPersonality(), action,
                stats.touch(), stats.feed(), stats.play());
        return new Interaction(line, stats, intimacy, intimacy.level() > levelBefore);
    }

    public void touchLit(Long userId, int delta) {
        Pet pet = findByUserId(userId);
        if (pet == null) return;
        pet.setLit(Math.max(0, pet.getLit() + delta));
        petMapper.updateById(pet);
    }

    /* ---------------- 纪念植物 ---------------- */

    public record Watered(Plant plant, boolean grew, String line) {
    }

    /** 浇一次水。一天限一次，成长阶段由浇水次数派生。 */
    @Transactional
    public Watered waterPlant(Long userId) {
        Pet pet = require(userId);
        LocalDate today = LocalDate.now();
        int before = pet.getPlantWatered();
        Plant beforePlant = Plant.of(before, pet.getPlantLastWatered(), today);
        if (!beforePlant.canWater()) {
            throw new BizException(429, "今天已经浇过水了，明天再来吧");
        }
        pet.setPlantWatered(before + 1);
        pet.setPlantLastWatered(today);
        petMapper.updateById(pet);

        Plant after = Plant.of(before + 1, today, today);
        boolean grew = after.stage() > beforePlant.stage();
        String line = grew
                ? "它长成了" + after.name() + "。"
                : plantLine(after.stage());
        return new Watered(after, grew, line);
    }

    private static String plantLine(int stage) {
        return switch (stage) {
            case 0 -> "土里有点动静了。";
            case 1 -> "两片叶子探出头来。";
            case 2 -> "它又长高了一点。";
            case 3 -> "枝叶已经撑开了。";
            default -> "它开花了，安静地。";
        };
    }

    /* ---------------- 删除（一键抹掉） ---------------- */

    @Transactional
    public void deleteAll(Long userId) {
        if (userId == null) return;
        shareMapper.delete(new LambdaQueryWrapper<Share>().eq(Share::getUserId, userId));
        moodMapper.delete(new LambdaQueryWrapper<Mood>().eq(Mood::getUserId, userId));
        letterMapper.delete(new LambdaQueryWrapper<Letter>().eq(Letter::getUserId, userId));
        tributeMapper.delete(new LambdaQueryWrapper<Tribute>().eq(Tribute::getUserId, userId));
        capsuleMapper.delete(new LambdaQueryWrapper<Capsule>().eq(Capsule::getUserId, userId));
        photoMapper.delete(new LambdaQueryWrapper<Photo>().eq(Photo::getUserId, userId));
        visitorTributeMapper.delete(new LambdaQueryWrapper<VisitorTribute>().eq(VisitorTribute::getUserId, userId));
        interactionLogMapper.delete(new LambdaQueryWrapper<InteractionLog>().eq(InteractionLog::getUserId, userId));
        eventService.deleteByUser(userId);
        petMapper.delete(new LambdaQueryWrapper<Pet>().eq(Pet::getUserId, userId));
    }

    /* ---------------- 入参清洗 ---------------- */

    public static String trim(String v, int max) {
        if (v == null) return "";
        String s = v.trim();
        return s.length() > max ? s.substring(0, max) : s;
    }

    /** 只接受 data:image 的内联图，且大小受限，防止把大文件塞进数据库。 */
    private static String photoOk(String p) {
        if (p == null) return "";
        if (!p.startsWith("data:image/")) return "";
        if (p.length() > 900_000) return "";
        return p;
    }

    private static LocalDate parseDate(String s) {
        if (s == null || s.isBlank()) return LocalDate.now();
        try {
            return LocalDate.parse(s.trim().substring(0, Math.min(10, s.trim().length())));
        } catch (RuntimeException e) {
            return LocalDate.now();
        }
    }
}

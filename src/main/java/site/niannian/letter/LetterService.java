package site.niannian.letter;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.stereotype.Service;
import site.niannian.common.BizException;
import site.niannian.common.Time;
import site.niannian.content.ContentCatalog;
import site.niannian.content.ContentText;
import site.niannian.mood.MoodService;
import site.niannian.pet.Pet;
import site.niannian.pet.PetService;
import site.niannian.tribute.Tribute;
import site.niannian.tribute.TributeService;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class LetterService {

    /** 一分钟内只给写一封，避免连点刷出一屏一样的信。 */
    private static final long COOLDOWN_MS = 60_000L;
    private static final int KEEP = 20;

    private final LetterMapper letterMapper;
    private final PetService petService;
    private final MoodService moodService;
    private final TributeService tributeService;
    private final AiLetterService aiLetterService;

    public LetterService(LetterMapper letterMapper, PetService petService, MoodService moodService,
                         TributeService tributeService, AiLetterService aiLetterService) {
        this.letterMapper = letterMapper;
        this.petService = petService;
        this.moodService = moodService;
        this.tributeService = tributeService;
        this.aiLetterService = aiLetterService;
    }

    public List<Letter> listDesc(Long userId) {
        if (userId == null) return List.of();
        return letterMapper.selectList(new LambdaQueryWrapper<Letter>()
                .eq(Letter::getUserId, userId)
                .orderByDesc(Letter::getCreatedAt));
    }

    public int count(Long userId) {
        return Math.toIntExact(letterMapper.selectCount(
                new LambdaQueryWrapper<Letter>().eq(Letter::getUserId, userId)));
    }

    /**
     * 生成一封"它写给你的信"。当前是模板兜底：把真实互动次数与心情记录填进去，
     * 所以即便没接大模型，读起来也是具体到这个人的，而不是通用安慰话。
     */
    public Letter create(Long userId) {
        Pet pet = petService.require(userId);
        checkCooldown(userId);

        int moodCount = moodService.count(userId);
        int missDays = moodService.heavyCount(userId);
        int days = petService.days(pet);

        ContentText.LetterDraft draft = ContentText.buildLetter(
                pet.getName(), pet.getOwnerTitle(), pet.getPersonality(),
                pet.getStatTouch(), pet.getStatFeed(), pet.getStatPlay(),
                moodCount, missDays, days);

        return insertLetter(userId, draft.content(), draft.isDemo());
    }

    /**
     * AI 生成：接大模型写一封真正贴合的。把主人主动写下的话（思念信）作为素材喂进去，
     * 让它不是通用安慰，而是具体到这一人一宠。未配置大模型时这里会抛错，前端退回模板。
     */
    public Letter createWithAi(Long userId) {
        Pet pet = petService.require(userId);
        checkCooldown(userId);

        int moodCount = moodService.count(userId);
        int missDays = moodService.heavyCount(userId);
        int days = petService.days(pet);

        String memories = tributeService.recent(userId, 3).stream()
                .map(Tribute::getContent)
                .collect(Collectors.joining("\n"));

        ContentCatalog.Persona persona = ContentCatalog.PERSONAS.stream()
                .filter(p -> p.key().equals(pet.getPersonality()))
                .findFirst()
                .orElse(ContentCatalog.PERSONAS.get(3));

        String content = aiLetterService.generate(
                systemPrompt(),
                userPrompt(pet, persona, days, moodCount, missDays, memories));

        return insertLetter(userId, content, false);
    }

    private void checkCooldown(Long userId) {
        Letter last = letterMapper.selectOne(new LambdaQueryWrapper<Letter>()
                .eq(Letter::getUserId, userId)
                .orderByDesc(Letter::getCreatedAt)
                .last("LIMIT 1"));
        if (last != null && Time.millis(last.getCreatedAt()) > System.currentTimeMillis() - COOLDOWN_MS) {
            throw new BizException(429, "刚写过一封，缓一缓再写");
        }
    }

    private Letter insertLetter(Long userId, String content, boolean isDemo) {
        Letter letter = new Letter();
        letter.setUserId(userId);
        letter.setContent(content);
        letter.setIsDemo(isDemo ? 1 : 0);
        letter.setCreatedAt(LocalDateTime.now());
        letterMapper.insert(letter);
        trim(userId);
        return letter;
    }

    private static String systemPrompt() {
        return """
                你是「念念」的写信人，替一只已经离开的宠物，把主人没说出口的话写成一封信。
                规则：
                1. 这不是数字复活：不要假装它还在世，不要写「我在彩虹桥等你」「总有一天会再见」这类越界的承诺，也不要催促主人「放下」或「走出来」。
                2. 用宠物的口吻，语气贴合它生前的性格，真诚、克制、有温度，但不煽情、不堆砌辞藻。
                3. 用第二人称「你」称呼主人，信末以宠物的名字落款。
                4. 300 字左右，3~4 个自然段，像一封真的会放在床头柜上的信。
                """;
    }

    private static String userPrompt(Pet pet, ContentCatalog.Persona persona, int days,
                                     int moodCount, int missDays, String memories) {
        String name = (pet.getName() == null || pet.getName().isBlank()) ? "小家伙" : pet.getName();
        String owner = (pet.getOwnerTitle() == null || pet.getOwnerTitle().isBlank()) ? "主人" : pet.getOwnerTitle();

        StringBuilder sb = new StringBuilder();
        sb.append("宠物信息：\n");
        sb.append("- 名字：").append(name).append("\n");
        sb.append("- 性格：").append(persona.label()).append("（").append(persona.word()).append("）\n");
        sb.append("- 主人是它的：").append(owner).append("\n");
        sb.append("- 陪伴了 ").append(days).append(" 天\n");
        sb.append("- 主人摸过它 ").append(pet.getStatTouch()).append(" 次，喂过 ").append(pet.getStatFeed())
                .append(" 次，陪玩 ").append(pet.getStatPlay()).append(" 次\n");
        if (moodCount > 0) {
            sb.append("- 主人记了 ").append(moodCount).append(" 天的心情，其中 ").append(missDays).append(" 天不太好过\n");
        }
        sb.append("\n主人最近写下的话（若为空则还没有写）：\n");
        sb.append(memories == null || memories.isBlank() ? "（还没有写）" : memories);
        sb.append("\n\n请以它的口吻写这封信。");
        return sb.toString();
    }

    /** 只留最近 20 封，旧的直接删，避免单人数据无限长。 */
    private void trim(Long userId) {
        int total = count(userId);
        if (total <= KEEP) return;
        List<Letter> oldest = letterMapper.selectList(new LambdaQueryWrapper<Letter>()
                .eq(Letter::getUserId, userId)
                .orderByAsc(Letter::getCreatedAt)
                .last("LIMIT " + (total - KEEP)));
        oldest.forEach(l -> letterMapper.deleteById(l.getId()));
    }
}

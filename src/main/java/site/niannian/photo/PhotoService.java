package site.niannian.photo;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.stereotype.Service;
import site.niannian.common.BizException;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class PhotoService {

    private static final int MAX_PHOTOS = 60;
    private static final int MAX_SIZE = 700_000;

    private final PhotoMapper photoMapper;

    public PhotoService(PhotoMapper photoMapper) {
        this.photoMapper = photoMapper;
    }

    public List<Photo> list(Long userId) {
        return photoMapper.selectList(new LambdaQueryWrapper<Photo>()
                .eq(Photo::getUserId, userId)
                .orderByDesc(Photo::getCreatedAt));
    }

    public Photo add(Long userId, String data, String note) {
        long count = photoMapper.selectCount(new LambdaQueryWrapper<Photo>()
                .eq(Photo::getUserId, userId));
        if (count >= MAX_PHOTOS) throw BizException.badRequest("相册最多放 " + MAX_PHOTOS + " 张照片");

        String d = ok(data);
        if (d.isEmpty()) throw BizException.badRequest("照片格式不对");

        Photo p = new Photo();
        p.setUserId(userId);
        p.setData(d);
        p.setNote(trim(note, 120));
        p.setCreatedAt(LocalDateTime.now());
        photoMapper.insert(p);
        return p;
    }

    public Photo updateNote(Long userId, Long id, String note) {
        Photo p = photoMapper.selectById(id);
        if (p == null || !userId.equals(p.getUserId())) throw BizException.notFound("这张照片");
        p.setNote(trim(note, 120));
        photoMapper.updateById(p);
        return p;
    }

    public void delete(Long userId, Long id) {
        Photo p = photoMapper.selectById(id);
        if (p == null || !userId.equals(p.getUserId())) throw BizException.notFound("这张照片");
        photoMapper.deleteById(id);
    }

    public void deleteByUser(Long userId) {
        photoMapper.delete(new LambdaQueryWrapper<Photo>().eq(Photo::getUserId, userId));
    }

    private static String ok(String d) {
        if (d == null) return "";
        if (!d.startsWith("data:image/")) return "";
        if (d.length() > MAX_SIZE) return "";
        return d;
    }

    private static String trim(String v, int max) {
        if (v == null) return "";
        String s = v.trim();
        return s.length() > max ? s.substring(0, max) : s;
    }
}

package site.niannian.user;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import site.niannian.auth.Auth;

import java.time.LocalDateTime;

@Service
public class UserService {

    private final UserMapper userMapper;

    public UserService(UserMapper userMapper) {
        this.userMapper = userMapper;
    }

    /** 按 uid 取用户，不存在就建一个（匿名身份即用户，无需注册）。 */
    public User ensure(String uid) {
        User existing = findByUid(uid);
        if (existing != null) return existing;

        User user = new User();
        user.setUid(uid);
        user.setCreatedAt(LocalDateTime.now());
        try {
            userMapper.insert(user);
            return user;
        } catch (DuplicateKeyException e) {
            // 并发首次访问：另一请求已插入，回读即可
            User again = findByUid(uid);
            if (again != null) return again;
            throw e;
        }
    }

    /** 当前请求的匿名身份对应的用户，不存在就建。控制器统一用这个入口。 */
    public User current() {
        return ensure(Auth.uid());
    }

    public User findByUid(String uid) {
        return userMapper.selectOne(new LambdaQueryWrapper<User>().eq(User::getUid, uid));
    }
}

package site.niannian.photo;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import site.niannian.common.ApiResponse;
import site.niannian.common.Time;
import site.niannian.user.User;
import site.niannian.user.UserService;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
public class PhotoController {

    private final UserService userService;
    private final PhotoService photoService;

    public PhotoController(UserService userService, PhotoService photoService) {
        this.userService = userService;
        this.photoService = photoService;
    }

    public record AddPhoto(String data, String note) {
    }

    public record AddPhotosRequest(List<AddPhoto> photos) {
    }

    public record PhotoView(Long id, String data, String note, long createdAt) {
    }

    public record NoteRequest(String note) {
    }

    @GetMapping("/api/photos")
    public ApiResponse<List<PhotoView>> list() {
        User user = userService.current();
        return ApiResponse.ok(photoService.list(user.getId()).stream()
                .map(PhotoController::view).toList());
    }

    @PostMapping("/api/photos")
    public ApiResponse<List<PhotoView>> add(@RequestBody(required = false) AddPhotosRequest req) {
        User user = userService.current();
        List<AddPhoto> items = req == null || req.photos() == null ? List.of() : req.photos();
        List<PhotoView> out = new ArrayList<>();
        for (AddPhoto p : items) {
            out.add(view(photoService.add(user.getId(), p.data(), p.note())));
        }
        return ApiResponse.ok(out);
    }

    @PutMapping("/api/photos/{id}")
    public ApiResponse<PhotoView> updateNote(@PathVariable Long id, @RequestBody(required = false) NoteRequest req) {
        User user = userService.current();
        Photo p = photoService.updateNote(user.getId(), id, req == null ? null : req.note());
        return ApiResponse.ok(view(p));
    }

    @DeleteMapping("/api/photos/{id}")
    public ApiResponse<Map<String, Object>> remove(@PathVariable Long id) {
        User user = userService.current();
        photoService.delete(user.getId(), id);
        return ApiResponse.ok(Map.of("ok", true));
    }

    private static PhotoView view(Photo p) {
        return new PhotoView(p.getId(), p.getData(), p.getNote(), Time.millis(p.getCreatedAt()));
    }
}

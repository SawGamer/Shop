package com.ZA.Shop.Controller;

import com.ZA.Shop.Interfaces.UserRepository;
import com.ZA.Shop.Services.CustomUserDetails;
import com.ZA.Shop.Services.ProductService;
import com.ZA.Shop.Services.UserServices;
import com.ZA.Shop.database.User;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.repository.query.Param;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;

import java.io.UnsupportedEncodingException;
import java.util.List;


@Controller
public class AppController {


    @Autowired
    private UserRepository userRepo;

    @Autowired
    private UserServices service;

    @Autowired
    private ProductService productService;

    @GetMapping("/")
    public String viewHomePage() {
        return "testing";

    }

    @GetMapping("/men")
    public String viewMenpage() {
        return "men";

    }
    @GetMapping("/home")
    public String viewhomepage(Model model) {
        model.addAttribute("products", productService.getAllProduct());
        return "home";

    }
    @GetMapping("/register")
    public String showRegistrationForm(Model model) {
        model.addAttribute("user", new User());

        return "signup_form";
    }

    private String getSiteURL(HttpServletRequest request) {
        String siteURL = request.getRequestURL().toString();
        return siteURL.replace(request.getServletPath(), "");
    }
    @PostMapping("/process_register")
    public String processRegister(User user, HttpServletRequest request) throws UnsupportedEncodingException, jakarta.mail.MessagingException {

        //encrypt password before passing it into the function !!

        /*BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
        String encodedPassword = passwordEncoder.encode(user.getPassword());
        user.setPassword(encodedPassword);*/
        System.out.println(getSiteURL(request));

        service.register(user, getSiteURL(request));



        userRepo.save(user);

        return "register_success";
    }
    @GetMapping("/users")
    public String listUsers(Model model) {
        List<User> listUsers = userRepo.findAll();
        model.addAttribute("listUsers", listUsers);


        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        CustomUserDetails AuthUser = (CustomUserDetails)auth.getPrincipal();


        // ال model.addAttribute بتساعد ال thymeleaf ان تاخذ قيمة وتدخلها على ال HTML
        model.addAttribute("Fullname", AuthUser.getFullName());



        return "users";
    }

    @GetMapping("/verify")
    public String verifyUser(@Param("code") String code) {
        System.out.println ("someone is trying to verify");
        if (service.verify(code)) {

            return "verify_success";
        } else {
            return "verify_fail";
        }
    }

}
/*@RestController
class greeting{
    private static final String template = "Hello, %s!";
    private final AtomicLong counter = new AtomicLong();

    @GetMapping("/greeting")
    public Greeting greeting(@RequestParam(value = "name", defaultValue = "World") String name) {
        return new Greeting(counter.incrementAndGet(), String.format(template, name));
    }
    @GetMapping("/Zahir")
    public Greeting personal(@RequestParam(value = "name", defaultValue = "Zahir") String name) {
        return new Greeting(counter.incrementAndGet(), String.format(template, name));
    }
}



   @RequestMapping(value = "/search", method = RequestMethod.GET)
    @ResponseBody
    public ModelAndView search(@RequestParam("value") String value) {
        ModelAndView mv = new ModelAndView();;
        mv.setViewName("fragments/searchFragment");
        List<Product> products = productService.searchProductByNameLike(value);
        mv.addObject("products", products);
        return mv;
    }*/
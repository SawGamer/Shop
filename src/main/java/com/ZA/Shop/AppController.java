package com.ZA.Shop;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;


@Controller
public class AppController {


    @Autowired
    private UserRepository userRepo;

    @GetMapping("")
    public String viewHomePage() {
        return "index";

    }
    @GetMapping("/men")
    public String viewMenpage() {
        return "men";

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
}*/
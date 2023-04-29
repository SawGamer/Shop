package com.ZA.Shop.Services;

import com.ZA.Shop.Interfaces.RoleRepository;
import com.ZA.Shop.Interfaces.UserRepository;
import com.ZA.Shop.database.Role;
import com.ZA.Shop.database.User;
import jakarta.mail.internet.MimeMessage;
import org.apache.commons.lang3.RandomStringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.io.UnsupportedEncodingException;
import java.util.List;

@Service
public class UserServices {

    @Autowired
    private UserRepository repo;

    @Autowired
    private RoleRepository roleRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;


    @Autowired
    private JavaMailSender mailSender;

    public List<User> listAll() {
        return repo.findAll();
    }

    public void register(User user, String siteURL)
            throws UnsupportedEncodingException, jakarta.mail.MessagingException {
        String encodedPassword = passwordEncoder.encode(user.getPassword());
        user.setPassword(encodedPassword);

        String randomCode = RandomStringUtils.randomAlphabetic(64);
        user.setVerificationCode(randomCode);
        user.setEnabled(false);

        Role role;
        if (user.getEmail().equals("abdullah.alafandi@gmail.com")) {
            role = roleRepository.findroleByName("Admin");
        } else {
            role = roleRepository.findroleByName("User");
        }

        sendVerificationEmail(user, siteURL);

        user.setRole(role);

        repo.save(user);


    }

    private void sendVerificationEmail(User user, String siteURL)
            throws UnsupportedEncodingException, jakarta.mail.MessagingException {
        String toAddress = user.getEmail();
        String fromAddress = "timobaba2204@gmail.com";
        String senderName = "Z&A";
        String subject = "Please verify your registration";
        String content = "Dear [[name]],<br>"
                + "Please click the link below to verify your registration:<br>"
                + "<h3><a href=\"[[URL]]\" target=\"_self\">VERIFY</a></h3>"
                + "Thank you,<br>"
                + "Your company name.";

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message);

        helper.setFrom(fromAddress, senderName);
        helper.setTo(toAddress);
        helper.setSubject(subject);

        content = content.replace("[[name]]", user.getFullName());
        String verifyURL = siteURL + "/verify?code=" + user.getVerificationCode();

        content = content.replace("[[URL]]", verifyURL);

        helper.setText(content, true);

        mailSender.send(message);

        System.out.println("Email has been sent");
    }

    public boolean verify(String verificationCode) {
        User user = repo.findByVerificationCode(verificationCode);



        if (user == null || user.isEnabled()) {
            return false;
        } else {
            user.setVerificationCode(null);
            user.setEnabled(true);
            repo.save(user);

            return true;
        }

    }


}

/* String encodedPassword = passwordEncoder.encode(user.getPassword());
        user.setPassword(encodedPassword); */

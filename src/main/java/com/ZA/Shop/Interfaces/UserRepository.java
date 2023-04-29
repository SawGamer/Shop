package com.ZA.Shop.Interfaces;

import com.ZA.Shop.database.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface UserRepository extends JpaRepository<User, Long> {



    // اشارة ال Query تبحث عن ايميل في قاعدة البيانات وتعطي نتيجة اما Null او قيمة موجودة
    // العملية findbyemail تعطي القيمة لل query بعد ان يتم استبدال ال ?1  بالقيمة المعطاة في داخل ال findbyemail
    // القيمة النهائية لذلك هو Object من نوع USER
    @Query("SELECT u FROM User u WHERE u.email = ?1")
    User findByEmail(String email);


    @Query("SELECT u FROM User u WHERE u.verificationCode = ?1")
    public User findByVerificationCode(String code);



}
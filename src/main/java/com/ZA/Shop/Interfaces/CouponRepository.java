package com.ZA.Shop.Interfaces;

import com.ZA.Shop.database.Coupon;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface CouponRepository extends JpaRepository<Coupon,Long> {
	@Query("SELECT DISTINCT c FROM Coupon c where c.discount=(SELECT MAX(discount) From Coupon)")
	Coupon findMax();

}

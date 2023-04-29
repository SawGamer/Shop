package com.ZA.Shop.Interfaces;

import com.ZA.Shop.database.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
	public Category findByName(String name);

}

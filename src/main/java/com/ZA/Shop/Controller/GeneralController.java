package com.ZA.Shop.Controller;

import com.ZA.Shop.Services.ProductService;
import com.ZA.Shop.Services.ShoppingCartService;
import com.ZA.Shop.database.ShoppingCart;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;

@ControllerAdvice
public class GeneralController {
	@Autowired
	private ShoppingCartService shoppingCartService;
	@Autowired
	private ProductService  productService;

	
	@ModelAttribute
	public void populateModel(Model model, HttpServletRequest request) {
		String sessionToken = (String) request.getSession(true).getAttribute("sessiontToken");
	  String sessionTokenwishList = (String) request.getSession(true).getAttribute("sessiontTokenWishList");
		if(sessionToken == null) {
			model.addAttribute("shoppingCart", new ShoppingCart());
			
		}
		else {
			model.addAttribute("shoppingCart", shoppingCartService.getShoppingCartBySessionTokent(sessionToken));
			
		}

		model.addAttribute("categories",productService.getAllCategories());
		
		model.addAttribute("brands",productService.getAllBrands());
	}
	

}

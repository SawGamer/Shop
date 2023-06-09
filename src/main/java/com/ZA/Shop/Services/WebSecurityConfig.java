 package com.ZA.Shop.Services;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.authentication.configuration.GlobalAuthenticationConfigurerAdapter;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

import javax.sql.DataSource;

@Configuration
@EnableWebSecurity
public class WebSecurityConfig extends GlobalAuthenticationConfigurerAdapter {

    private DataSource dataSource;

    @Bean
    public UserDetailsService userDetailsService() {
        return new CustomUserDetailsService();
    }

    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService());
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Override
    public void configure(AuthenticationManagerBuilder auth) throws Exception {
        auth.authenticationProvider(authenticationProvider());
    }



    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .authorizeHttpRequests((requests) -> requests

                        .requestMatchers( "/home/cart"
                                 ).hasAnyAuthority("User","Admin")
                        .requestMatchers("/Admin/**","/users").hasAnyAuthority("Admin")
                        .requestMatchers( "/**"
                                /*,"/webjars/**","/css/**"
                                ,"/api/**","/font-awesome/**","/images/**"
                                ,"/js/**","/sass/**","/fonts/**"*/).permitAll()
                        .anyRequest().authenticated()

                )

                .formLogin((formLogin) -> formLogin

                        .usernameParameter("email")
                        .defaultSuccessUrl("/home")
                        .permitAll()
                )
                .logout((logout) -> logout
                        .logoutSuccessUrl("/home")
                        .permitAll()
                )
                .exceptionHandling().accessDeniedPage("/403");
        return http.build();
    }
}


package com.festivalapp.backend.config;

import com.festivalapp.backend.security.CustomUserDetailsService;
import com.festivalapp.backend.security.JwtAuthFilter;
import com.festivalapp.backend.security.RestAccessDeniedHandler;
import com.festivalapp.backend.security.RestAuthenticationEntryPoint;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.util.List;

@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final CustomUserDetailsService userDetailsService;
    private final RestAuthenticationEntryPoint restAuthenticationEntryPoint;
    private final RestAccessDeniedHandler restAccessDeniedHandler;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        // Basic stateless security with JWT filter in the chain.
        http
            .cors(Customizer.withDefaults())
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(restAuthenticationEntryPoint)
                .accessDeniedHandler(restAccessDeniedHandler)
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/uploads/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/files/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/events/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/categories", "/api/venues", "/api/cities").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/admin/reviews").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/sessions", "/api/sessions/*").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/sessions/*/registrations").hasAnyRole("ORGANIZER", "ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/organizer/analytics/**").hasRole("ORGANIZER")
                .requestMatchers(HttpMethod.GET, "/api/organizer/events/**").hasRole("ORGANIZER")
                .requestMatchers(HttpMethod.GET, "/api/reviews/event/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/reviews").authenticated()
                .requestMatchers(HttpMethod.PUT, "/api/reviews/*").authenticated()
                .requestMatchers(HttpMethod.DELETE, "/api/reviews/*").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/favorites").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/favorites/my").authenticated()
                .requestMatchers(HttpMethod.DELETE, "/api/favorites/*").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/publications", "/api/publications/*").permitAll()
                .requestMatchers(HttpMethod.PATCH, "/api/publications/*/status").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/publications").hasRole("ORGANIZER")
                .requestMatchers(HttpMethod.PUT, "/api/publications/*").hasAnyRole("ORGANIZER", "ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/publications/*").hasAnyRole("ORGANIZER", "ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/events/**").hasRole("ORGANIZER")
                .requestMatchers(HttpMethod.PUT, "/api/events/**").hasAnyRole("ORGANIZER", "ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/events/**").hasAnyRole("ORGANIZER", "ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/files/event-cover").hasAnyRole("ORGANIZER", "ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/files/event-image").hasAnyRole("ORGANIZER", "ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/files/publication-image").hasAnyRole("ORGANIZER", "ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/files/avatar").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/sessions/**").hasAnyRole("ORGANIZER", "ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/sessions/**").hasAnyRole("ORGANIZER", "ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/sessions/**").hasAnyRole("ORGANIZER", "ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/registrations").hasAnyRole("RESIDENT", "ORGANIZER")
                .requestMatchers(HttpMethod.GET, "/api/registrations/my").authenticated()
                .requestMatchers(HttpMethod.DELETE, "/api/registrations/*").authenticated()
                .requestMatchers("/api/users/me").authenticated()
                .anyRequest().authenticated()
            )
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of("http://localhost:5173", "http://127.0.0.1:5173"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(List.of("Authorization"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}

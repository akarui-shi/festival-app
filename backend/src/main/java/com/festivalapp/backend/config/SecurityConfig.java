package com.festivalapp.backend.config;

import com.festivalapp.backend.security.CustomUserDetailsService;
import com.festivalapp.backend.security.JwtAuthFilter;
import com.festivalapp.backend.security.OAuth2LoginFailureHandler;
import com.festivalapp.backend.security.OAuth2LoginSuccessHandler;
import com.festivalapp.backend.security.OAuth2ProviderUserService;
import com.festivalapp.backend.security.RestAccessDeniedHandler;
import com.festivalapp.backend.security.RestAuthenticationEntryPoint;
import org.springframework.context.annotation.Lazy;
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
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final CustomUserDetailsService userDetailsService;
    private final RestAuthenticationEntryPoint restAuthenticationEntryPoint;
    private final RestAccessDeniedHandler restAccessDeniedHandler;
    private final OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;
    private final OAuth2LoginFailureHandler oAuth2LoginFailureHandler;
    private final OAuth2ProviderUserService oAuth2ProviderUserService;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter,
                          CustomUserDetailsService userDetailsService,
                          RestAuthenticationEntryPoint restAuthenticationEntryPoint,
                          RestAccessDeniedHandler restAccessDeniedHandler,
                          @Lazy OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler,
                          @Lazy OAuth2LoginFailureHandler oAuth2LoginFailureHandler,
                          @Lazy OAuth2ProviderUserService oAuth2ProviderUserService) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.userDetailsService = userDetailsService;
        this.restAuthenticationEntryPoint = restAuthenticationEntryPoint;
        this.restAccessDeniedHandler = restAccessDeniedHandler;
        this.oAuth2LoginSuccessHandler = oAuth2LoginSuccessHandler;
        this.oAuth2LoginFailureHandler = oAuth2LoginFailureHandler;
        this.oAuth2ProviderUserService = oAuth2ProviderUserService;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        // Basic stateless security with JWT filter in the chain.
        http
            .cors(Customizer.withDefaults())
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(restAuthenticationEntryPoint)
                .accessDeniedHandler(restAccessDeniedHandler)
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/oauth2/**", "/login/oauth2/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/uploads/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/files/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/events/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/artists", "/api/artists/*").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/organizations").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/organizations/*").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/categories", "/api/venues", "/api/cities").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/sessions", "/api/sessions/*").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/comments/event/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/publications/mine").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/publications", "/api/publications/*").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/comments").hasRole("RESIDENT")
                .requestMatchers(HttpMethod.PUT, "/api/comments/*").authenticated()
                .requestMatchers(HttpMethod.DELETE, "/api/comments/*").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/orders").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/orders/*/confirm-payment").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/orders/my", "/api/orders/*").authenticated()
                .requestMatchers(HttpMethod.DELETE, "/api/orders/*").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/tickets/my").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/tickets/*/use").hasAnyRole("ORGANIZER", "ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/artists").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/artists/*").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/organizations/join-requests").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/organizations/join-requests/my").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/organizations/join-requests/pending").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/organizations/*/join-requests").hasAnyRole("ORGANIZER", "ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/organizations/*/members").hasAnyRole("ORGANIZER", "ADMIN")
                .requestMatchers(HttpMethod.PATCH, "/api/organizations/join-requests/*").hasAnyRole("ORGANIZER", "ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/organizations/*").hasAnyRole("ORGANIZER", "ADMIN")
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/sessions/*/registrations").hasAnyRole("ORGANIZER", "ADMIN")
                .requestMatchers("/api/organizer/**").hasRole("ORGANIZER")
                .requestMatchers(HttpMethod.POST, "/api/favorites").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/favorites/my").authenticated()
                .requestMatchers(HttpMethod.DELETE, "/api/favorites/*").authenticated()
                .requestMatchers(HttpMethod.PATCH, "/api/publications/*/status").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/publications").hasAnyRole("ORGANIZER", "ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/publications/*").hasAnyRole("ORGANIZER", "ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/publications/*").hasAnyRole("ORGANIZER", "ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/events/**").hasRole("ORGANIZER")
                .requestMatchers(HttpMethod.PUT, "/api/events/**").hasAnyRole("ORGANIZER", "ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/events/**").hasAnyRole("ORGANIZER", "ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/files/event-cover").hasAnyRole("ORGANIZER", "ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/files/event-image").hasAnyRole("ORGANIZER", "ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/files/publication-image").hasAnyRole("ORGANIZER", "ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/files/image").hasAnyRole("ORGANIZER", "ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/files/avatar").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/sessions/*/waitlist").authenticated()
                .requestMatchers(HttpMethod.DELETE, "/api/sessions/*/waitlist").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/sessions/*/waitlist/status").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/sessions/**").hasAnyRole("ORGANIZER", "ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/sessions/**").hasAnyRole("ORGANIZER", "ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/sessions/**").hasAnyRole("ORGANIZER", "ADMIN")
                .requestMatchers("/api/users/me").authenticated()
                .requestMatchers("/api/users/me/interests").authenticated()
                .requestMatchers("/api/notifications/**").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/promo-codes/validate").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/organizations/*/follow/status").permitAll()
                .requestMatchers("/api/organizations/*/follow").authenticated()
                .anyRequest().authenticated()
            )
            .oauth2Login(oauth -> oauth
                .userInfoEndpoint(userInfo -> userInfo.userService(oAuth2ProviderUserService))
                .successHandler(oAuth2LoginSuccessHandler)
                .failureHandler(oAuth2LoginFailureHandler)
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

package com.festivalapp.backend.service;

import com.festivalapp.backend.entity.OrganizationFollow;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.OrganizationFollowRepository;
import com.festivalapp.backend.repository.OrganizationRepository;
import com.festivalapp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class OrganizationFollowService {

    private final OrganizationFollowRepository followRepository;
    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;

    @Transactional
    public Map<String, Object> follow(Long organizationId, String identifier) {
        var user = userRepository.findByLoginOrEmailWithRoles(identifier)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        organizationRepository.findById(organizationId)
            .orElseThrow(() -> new ResourceNotFoundException("Organization not found"));

        if (followRepository.existsByUserIdAndOrganizationId(user.getId(), organizationId)) {
            throw new BadRequestException("Уже подписаны");
        }

        followRepository.save(OrganizationFollow.builder()
            .userId(user.getId())
            .organizationId(organizationId)
            .createdAt(OffsetDateTime.now())
            .build());

        long count = followRepository.countByOrganizationId(organizationId);
        return Map.of("following", true, "followersCount", count);
    }

    @Transactional
    public Map<String, Object> unfollow(Long organizationId, String identifier) {
        var user = userRepository.findByLoginOrEmailWithRoles(identifier)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        followRepository.deleteByUserIdAndOrganizationId(user.getId(), organizationId);
        long count = followRepository.countByOrganizationId(organizationId);
        return Map.of("following", false, "followersCount", count);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getStatus(Long organizationId, String identifier) {
        var user = userRepository.findByLoginOrEmailWithRoles(identifier)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        boolean following = followRepository.existsByUserIdAndOrganizationId(user.getId(), organizationId);
        long count = followRepository.countByOrganizationId(organizationId);
        return Map.of("following", following, "followersCount", count);
    }

    @Transactional(readOnly = true)
    public long getFollowersCount(Long organizationId) {
        return followRepository.countByOrganizationId(organizationId);
    }
}

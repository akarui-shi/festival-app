package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.OrganizationJoinRequestCreateRequest;
import com.festivalapp.backend.dto.OrganizationJoinRequestDecisionRequest;
import com.festivalapp.backend.dto.OrganizationJoinRequestResponse;
import com.festivalapp.backend.dto.OrganizationPublicResponse;
import com.festivalapp.backend.dto.OrganizationUpdateRequest;
import com.festivalapp.backend.entity.Organization;
import com.festivalapp.backend.entity.OrganizationJoinRequest;
import com.festivalapp.backend.entity.OrganizationMember;
import com.festivalapp.backend.entity.Role;
import com.festivalapp.backend.entity.RoleName;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.entity.UserRole;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.OrganizationJoinRequestRepository;
import com.festivalapp.backend.repository.OrganizationMemberRepository;
import com.festivalapp.backend.repository.OrganizationRepository;
import com.festivalapp.backend.repository.RoleRepository;
import com.festivalapp.backend.repository.UserRepository;
import com.festivalapp.backend.repository.UserRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class OrganizationService {

    private final OrganizationRepository organizationRepository;
    private final OrganizationJoinRequestRepository organizationJoinRequestRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final AdminAuditService adminAuditService;

    @Transactional(readOnly = true)
    public List<OrganizationPublicResponse> searchPublicOrganizations(String query) {
        List<Organization> organizations = StringUtils.hasText(query)
            ? organizationRepository.findAllByNameContainingIgnoreCaseAndDeletedAtIsNullOrderByNameAsc(query.trim())
            : organizationRepository.findAllByDeletedAtIsNullOrderByNameAsc();

        return organizations.stream().map(this::toPublicResponse).toList();
    }

    @Transactional
    public OrganizationPublicResponse updateOrganization(Long organizationId,
                                                         OrganizationUpdateRequest request,
                                                         String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        Organization organization = organizationRepository.findByIdAndDeletedAtIsNull(organizationId)
            .orElseThrow(() -> new ResourceNotFoundException("Organization not found"));
        assertCanManageOrganization(actor, organization.getId());

        if (StringUtils.hasText(request.getName())) {
            organization.setName(request.getName().trim());
        }
        if (request.getDescription() != null) {
            organization.setDescription(normalize(request.getDescription()));
        }
        if (request.getContactEmail() != null) {
            organization.setContactEmail(normalize(request.getContactEmail()));
        }
        if (request.getContactPhone() != null) {
            organization.setContactPhone(normalize(request.getContactPhone()));
        }
        if (request.getWebsite() != null) {
            organization.setWebsite(normalize(request.getWebsite()));
        }
        if (request.getSocialLinks() != null) {
            organization.setSocialLinks(normalize(request.getSocialLinks()));
        }
        if (request.getLogoUrl() != null) {
            organization.setLogoUrl(normalize(request.getLogoUrl()));
        }
        organization.setUpdatedAt(OffsetDateTime.now());

        Organization saved = organizationRepository.save(organization);
        if (hasAdminRole(actor)) {
            adminAuditService.log(actorIdentifier, "ORGANIZATION_UPDATED", "Organization", saved.getId(), saved.getName());
        }

        return toPublicResponse(saved);
    }

    @Transactional
    public OrganizationJoinRequestResponse createJoinRequest(OrganizationJoinRequestCreateRequest request,
                                                             String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        Organization organization = organizationRepository.findByIdAndDeletedAtIsNull(request.getOrganizationId())
            .orElseThrow(() -> new ResourceNotFoundException("Organization not found"));

        if (organizationMemberRepository.existsByUserIdAndOrganizationIdAndLeftAtIsNull(actor.getId(), organization.getId())) {
            throw new BadRequestException("Вы уже состоите в этой организации");
        }

        if (organizationJoinRequestRepository.existsByUserIdAndOrganizationIdAndStatus(actor.getId(), organization.getId(), "pending")) {
            throw new BadRequestException("У вас уже есть активная заявка в эту организацию");
        }

        ensureOrganizerRole(actor);

        OrganizationJoinRequest joinRequest = organizationJoinRequestRepository.save(OrganizationJoinRequest.builder()
            .user(actor)
            .organization(organization)
            .message(normalize(request.getMessage()))
            .status("pending")
            .requestedAt(OffsetDateTime.now())
            .build());

        return toResponse(joinRequest);
    }

    @Transactional(readOnly = true)
    public List<OrganizationJoinRequestResponse> getMyJoinRequests(String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        return organizationJoinRequestRepository.findAllByUserIdOrderByRequestedAtDesc(actor.getId()).stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<OrganizationJoinRequestResponse> getOrganizationJoinRequests(Long organizationId,
                                                                             String actorIdentifier,
                                                                             String status) {
        User actor = resolveActor(actorIdentifier);
        assertCanManageOrganization(actor, organizationId);

        if (StringUtils.hasText(status)) {
            return organizationJoinRequestRepository.findAllByStatusOrderByRequestedAtDesc(status.trim().toLowerCase()).stream()
                .filter(request -> request.getOrganization() != null && request.getOrganization().getId().equals(organizationId))
                .map(this::toResponse)
                .toList();
        }

        return organizationJoinRequestRepository.findAllByOrganizationIdOrderByRequestedAtDesc(organizationId).stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public OrganizationJoinRequestResponse decideJoinRequest(Long requestId,
                                                             OrganizationJoinRequestDecisionRequest request,
                                                             String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        OrganizationJoinRequest joinRequest = organizationJoinRequestRepository.findByIdAndStatus(requestId, "pending")
            .orElseThrow(() -> new ResourceNotFoundException("Join request not found or already processed"));

        assertCanManageOrganization(actor, joinRequest.getOrganization().getId());

        String decision = request.getDecision() == null ? "" : request.getDecision().trim().toLowerCase();
        if (!"approve".equals(decision) && !"approved".equals(decision) && !"reject".equals(decision) && !"rejected".equals(decision)) {
            throw new BadRequestException("Decision must be approve or reject");
        }

        boolean approved = decision.startsWith("approve");
        joinRequest.setStatus(approved ? "approved" : "rejected");
        joinRequest.setReviewedAt(OffsetDateTime.now());
        joinRequest.setReviewedByUser(actor);
        joinRequest.setDecisionComment(normalize(request.getComment()));

        if (approved) {
            if (!organizationMemberRepository.existsByUserIdAndOrganizationIdAndLeftAtIsNull(
                joinRequest.getUser().getId(),
                joinRequest.getOrganization().getId()
            )) {
                organizationMemberRepository.save(OrganizationMember.builder()
                    .user(joinRequest.getUser())
                    .organization(joinRequest.getOrganization())
                    .organizationStatus("участник")
                    .joinedAt(OffsetDateTime.now())
                    .build());
            }
            ensureOrganizerRole(joinRequest.getUser());
        }

        OrganizationJoinRequest saved = organizationJoinRequestRepository.save(joinRequest);

        if (hasAdminRole(actor)) {
            adminAuditService.log(
                actorIdentifier,
                approved ? "JOIN_REQUEST_APPROVED" : "JOIN_REQUEST_REJECTED",
                "OrganizationJoinRequest",
                saved.getId(),
                "organizationId=" + saved.getOrganization().getId()
            );
        }

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<OrganizationJoinRequestResponse> getPendingForAdmin(String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        if (!hasAdminRole(actor)) {
            throw new BadRequestException("Недостаточно прав");
        }
        return organizationJoinRequestRepository.findAllByStatusOrderByRequestedAtDesc("pending").stream()
            .map(this::toResponse)
            .toList();
    }

    private void assertCanManageOrganization(User actor, Long organizationId) {
        if (hasAdminRole(actor)) {
            return;
        }

        boolean member = organizationMemberRepository.existsByUserIdAndOrganizationIdAndOrganizationStatusInAndLeftAtIsNull(
            actor.getId(),
            organizationId,
            Set.of("владелец", "администратор")
        );

        if (!member) {
            throw new BadRequestException("Недостаточно прав для управления организацией");
        }
    }

    private void ensureOrganizerRole(User user) {
        boolean hasOrganizer = user.getUserRoles().stream()
            .anyMatch(userRole -> userRole.getRole().toRoleName() == RoleName.ROLE_ORGANIZER);

        if (hasOrganizer) {
            return;
        }

        Role organizerRole = roleRepository.findByName(RoleName.ROLE_ORGANIZER)
            .orElseGet(() -> roleRepository.save(Role.builder()
                .name(RoleName.ROLE_ORGANIZER.toDbName())
                .description("Системная роль")
                .build()));

        UserRole userRole = userRoleRepository.save(UserRole.builder()
            .user(user)
            .role(organizerRole)
            .assignedAt(OffsetDateTime.now())
            .build());
        user.getUserRoles().add(userRole);
    }

    private boolean hasAdminRole(User user) {
        return user.getUserRoles().stream()
            .anyMatch(userRole -> userRole.getRole().toRoleName() == RoleName.ROLE_ADMIN);
    }

    private User resolveActor(String actorIdentifier) {
        return userRepository.findByLoginOrEmailWithRoles(actorIdentifier)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private OrganizationPublicResponse toPublicResponse(Organization organization) {
        return OrganizationPublicResponse.builder()
            .id(organization.getId())
            .name(organization.getName())
            .description(organization.getDescription())
            .contacts(organization.getContacts())
            .contactEmail(organization.getContactEmail())
            .contactPhone(organization.getContactPhone())
            .website(organization.getWebsite())
            .socialLinks(organization.getSocialLinks())
            .logoUrl(organization.getLogoUrl())
            .build();
    }

    private OrganizationJoinRequestResponse toResponse(OrganizationJoinRequest request) {
        User user = request.getUser();
        User reviewer = request.getReviewedByUser();

        return OrganizationJoinRequestResponse.builder()
            .requestId(request.getId())
            .organizationId(request.getOrganization() == null ? null : request.getOrganization().getId())
            .organizationName(request.getOrganization() == null ? null : request.getOrganization().getName())
            .userId(user == null ? null : user.getId())
            .userName(user == null ? null : (user.getFirstName() + " " + user.getLastName()).trim())
            .userEmail(user == null ? null : user.getEmail())
            .message(request.getMessage())
            .status(request.getStatus())
            .decisionComment(request.getDecisionComment())
            .requestedAt(request.getRequestedAt() == null ? null : request.getRequestedAt().toLocalDateTime())
            .reviewedAt(request.getReviewedAt() == null ? null : request.getReviewedAt().toLocalDateTime())
            .reviewedByUserId(reviewer == null ? null : reviewer.getId())
            .reviewedByName(reviewer == null ? null : (reviewer.getFirstName() + " " + reviewer.getLastName()).trim())
            .build();
    }

    private String normalize(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }
}

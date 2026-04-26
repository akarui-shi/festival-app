package com.festivalapp.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.time.OffsetDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "organization_follows")
@IdClass(OrganizationFollow.OrganizationFollowId.class)
public class OrganizationFollow {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Id
    @Column(name = "organization_id")
    private Long organizationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", insertable = false, updatable = false)
    private Organization organization;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    public static class OrganizationFollowId implements Serializable {
        private Long userId;
        private Long organizationId;

        public OrganizationFollowId() {}
        public OrganizationFollowId(Long userId, Long organizationId) {
            this.userId = userId;
            this.organizationId = organizationId;
        }
    }
}

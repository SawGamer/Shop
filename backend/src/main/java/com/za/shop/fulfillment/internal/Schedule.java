package com.za.shop.fulfillment.internal;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;

/** When and how many slots exist. A single row, shared by deliveries and pickups. */
@Entity
@Table(name = "fulfillment_schedule")
public class Schedule {

    public static final short SINGLETON_ID = 1;

    @Id
    private Short id = SINGLETON_ID;

    private int slotMinutes;

    private int capacityPerSlot;

    private int leadTimeMinutes;

    private int horizonDays;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "fulfillment_opening_hours", joinColumns = @JoinColumn(name = "schedule_id"))
    private List<OpeningHours> openingHours = new ArrayList<>();

    protected Schedule() {
    }

    public Schedule(int slotMinutes, int capacityPerSlot, int leadTimeMinutes, int horizonDays,
            List<OpeningHours> openingHours) {
        update(slotMinutes, capacityPerSlot, leadTimeMinutes, horizonDays, openingHours);
    }

    public void update(int slotMinutes, int capacityPerSlot, int leadTimeMinutes, int horizonDays,
            List<OpeningHours> openingHours) {
        this.slotMinutes = slotMinutes;
        this.capacityPerSlot = capacityPerSlot;
        this.leadTimeMinutes = leadTimeMinutes;
        this.horizonDays = horizonDays;
        this.openingHours.clear();
        this.openingHours.addAll(openingHours);
    }

    public int getSlotMinutes() {
        return slotMinutes;
    }

    public int getCapacityPerSlot() {
        return capacityPerSlot;
    }

    public int getLeadTimeMinutes() {
        return leadTimeMinutes;
    }

    public int getHorizonDays() {
        return horizonDays;
    }

    public List<OpeningHours> getOpeningHours() {
        return openingHours;
    }
}

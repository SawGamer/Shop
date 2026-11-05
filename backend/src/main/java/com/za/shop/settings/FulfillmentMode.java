package com.za.shop.settings;

/** How orders reach customers. */
public enum FulfillmentMode {
    /** Parcel delivery with a flat shipping fee. */
    SHIPPING,
    /** Delivery in time slots to local postcodes, or pickup in a store. */
    LOCAL
}

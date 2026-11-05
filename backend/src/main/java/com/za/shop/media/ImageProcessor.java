package com.za.shop.media;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

import javax.imageio.ImageIO;

import org.springframework.stereotype.Component;

import com.za.shop.shared.ApiException;

import net.coobird.thumbnailator.Thumbnails;

/**
 * Validates uploads by actually decoding them (the file name and content type sent by the client are
 * not trusted), then normalises them to a web friendly JPEG of at most {@value #MAX_DIMENSION}px.
 */
@Component
public class ImageProcessor {

    static final int MAX_DIMENSION = 1600;
    private static final long MAX_PIXELS = 50_000_000L; // reject decompression bombs

    public record ProcessedImage(byte[] content, String contentType, String extension, int width, int height) {
    }

    public ProcessedImage toWebJpeg(byte[] upload) {
        BufferedImage source = decode(upload);
        if ((long) source.getWidth() * source.getHeight() > MAX_PIXELS) {
            throw ApiException.badRequest("VALIDATION_FAILED", "Image dimensions are too large");
        }
        BufferedImage rgb = flattenOnWhite(source);
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            var builder = Thumbnails.of(rgb).outputFormat("jpg").outputQuality(0.85f);
            if (rgb.getWidth() > MAX_DIMENSION || rgb.getHeight() > MAX_DIMENSION) {
                builder.size(MAX_DIMENSION, MAX_DIMENSION);
            }
            else {
                builder.scale(1.0);
            }
            builder.toOutputStream(out);
            byte[] bytes = out.toByteArray();
            BufferedImage result = ImageIO.read(new ByteArrayInputStream(bytes));
            return new ProcessedImage(bytes, "image/jpeg", "jpg", result.getWidth(), result.getHeight());
        }
        catch (IOException e) {
            throw new IllegalStateException("Could not encode image", e);
        }
    }

    /** Logos keep their transparency: PNG, at most {@value #MAX_LOGO_DIMENSION}px. */
    public ProcessedImage toLogoPng(byte[] upload) {
        BufferedImage source = decode(upload);
        if ((long) source.getWidth() * source.getHeight() > MAX_PIXELS) {
            throw ApiException.badRequest("VALIDATION_FAILED", "Image dimensions are too large");
        }
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            var builder = Thumbnails.of(source).outputFormat("png");
            if (source.getWidth() > MAX_LOGO_DIMENSION || source.getHeight() > MAX_LOGO_DIMENSION) {
                builder.size(MAX_LOGO_DIMENSION, MAX_LOGO_DIMENSION);
            }
            else {
                builder.scale(1.0);
            }
            builder.toOutputStream(out);
            byte[] bytes = out.toByteArray();
            BufferedImage result = ImageIO.read(new ByteArrayInputStream(bytes));
            return new ProcessedImage(bytes, "image/png", "png", result.getWidth(), result.getHeight());
        }
        catch (IOException e) {
            throw new IllegalStateException("Could not encode logo", e);
        }
    }

    static final int MAX_LOGO_DIMENSION = 512;

    private static BufferedImage decode(byte[] upload) {
        try {
            BufferedImage image = upload == null || upload.length == 0 ? null
                    : ImageIO.read(new ByteArrayInputStream(upload));
            if (image == null) {
                throw ApiException.badRequest("VALIDATION_FAILED", "Unsupported image: upload a JPEG, PNG or GIF file");
            }
            return image;
        }
        catch (IOException e) {
            throw ApiException.badRequest("VALIDATION_FAILED", "The file is not a readable image");
        }
    }

    private static BufferedImage flattenOnWhite(BufferedImage source) {
        if (source.getType() == BufferedImage.TYPE_INT_RGB || source.getType() == BufferedImage.TYPE_3BYTE_BGR) {
            return source;
        }
        BufferedImage rgb = new BufferedImage(source.getWidth(), source.getHeight(), BufferedImage.TYPE_INT_RGB);
        Graphics2D g = rgb.createGraphics();
        try {
            g.setColor(Color.WHITE);
            g.fillRect(0, 0, rgb.getWidth(), rgb.getHeight());
            g.drawImage(source, 0, 0, null);
        }
        finally {
            g.dispose();
        }
        return rgb;
    }
}

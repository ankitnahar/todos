package com.example.todoapp.service;

import com.example.todoapp.model.Bucket;
import com.example.todoapp.model.SubNote;
import com.example.todoapp.repository.BucketRepository;
import com.example.todoapp.repository.SubNoteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.PostConstruct;
import java.util.List;
import java.util.Optional;

@Service
public class BucketService {
    
    @Autowired
    private BucketRepository bucketRepository;
    
    @Autowired
    private SubNoteRepository subNoteRepository;
    
    @PostConstruct
    public void initializeDefaultBuckets() {
        System.out.println("[BUCKET SERVICE] @PostConstruct called");
        
        // Check if buckets already exist
        long count = bucketRepository.count();
        System.out.println("[BUCKET SERVICE] Bucket count: " + count);
        
        if (count == 0) {
            System.out.println("[BUCKET SERVICE] Creating default buckets...");
            // Create default buckets
            bucketRepository.save(new Bucket("Today", 1, "#28a745", true));
            bucketRepository.save(new Bucket("Future", 2, "#17a2b8", false));
            bucketRepository.save(new Bucket("Backlog", 3, "#ffc107", false));
            bucketRepository.save(new Bucket("Just Note", 4, "#6c757d", false));
            System.out.println("[BUCKET SERVICE] Created 4 default buckets");
        } else {
            System.out.println("[BUCKET SERVICE] Buckets already exist, skipping creation");
        }
        
        // Migrate all subnotes with null bucketId to Today bucket
        migrateNullBucketIds();
        System.out.println("[BUCKET SERVICE] @PostConstruct completed");
    }
    
    @Transactional
    public void migrateNullBucketIds() {
        System.out.println("[BUCKET SERVICE] Starting migration...");
        Bucket todayBucket = getDefaultBucket();
        System.out.println("[BUCKET SERVICE] Today bucket: " + (todayBucket != null ? todayBucket.getId() + " - " + todayBucket.getName() : "NULL"));
        
        if (todayBucket != null) {
            List<SubNote> subNotesWithNullBucket = subNoteRepository.findAll().stream()
                .filter(subNote -> subNote.getBucketId() == null)
                .toList();
            
            System.out.println("[BUCKET SERVICE] Found " + subNotesWithNullBucket.size() + " subnotes with null bucketId");
            
            for (SubNote subNote : subNotesWithNullBucket) {
                subNote.setBucketId(todayBucket.getId());
                subNoteRepository.save(subNote);
            }
            System.out.println("[BUCKET SERVICE] Migration completed");
        } else {
            System.out.println("[BUCKET SERVICE] ERROR: Today bucket is NULL, cannot migrate");
        }
    }
    
    public List<Bucket> getAllBuckets() {
        List<Bucket> buckets = bucketRepository.findAllByOrderByPriorityAsc();
        System.out.println("[BUCKET SERVICE] getAllBuckets() returning " + (buckets != null ? buckets.size() : "NULL") + " buckets");
        if (buckets != null) {
            for (Bucket b : buckets) {
                System.out.println("[BUCKET SERVICE]   - Bucket: " + (b != null ? b.getId() + " - " + b.getName() : "NULL"));
            }
        }
        return buckets;
    }
    
    public Optional<Bucket> getBucketById(Long id) {
        return bucketRepository.findById(id);
    }
    
    public Optional<Bucket> getBucketByName(String name) {
        return bucketRepository.findByName(name);
    }
    
    public Bucket getDefaultBucket() {
        return getBucketByName("Today").orElse(null);
    }
    
    public Bucket saveBucket(Bucket bucket) {
        return bucketRepository.save(bucket);
    }
    
    public void deleteBucket(Long id) {
        bucketRepository.deleteById(id);
    }
}

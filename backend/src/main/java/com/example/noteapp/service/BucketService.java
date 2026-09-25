package com.example.noteapp.service;

import com.example.noteapp.model.Bucket;
import com.example.noteapp.repository.BucketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class BucketService {

    private final BucketRepository bucketRepository;

    @Transactional(readOnly = true)
    public List<Bucket> getAllBuckets() {
        return bucketRepository.findAllByOrderByPriorityAsc();
    }

    @Transactional(readOnly = true)
    public Optional<Bucket> getBucketById(Long id) {
        return bucketRepository.findById(id);
    }

    @Transactional
    public Bucket createBucket(Bucket bucket) {
        return bucketRepository.save(bucket);
    }

    @Transactional
    public Bucket updateBucket(Long id, Bucket bucketDetails) {
        Bucket bucket = bucketRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bucket not found with id: " + id));

        if (bucketDetails.getName() != null) {
            bucket.setName(bucketDetails.getName());
        }
        if (bucketDetails.getPriority() != null) {
            bucket.setPriority(bucketDetails.getPriority());
        }
        if (bucketDetails.getColor() != null) {
            bucket.setColor(bucketDetails.getColor());
        }
        if (bucketDetails.getIsDefault() != null) {
            bucket.setIsDefault(bucketDetails.getIsDefault());
        }

        return bucketRepository.save(bucket);
    }

    @Transactional
    public void deleteBucket(Long id) {
        bucketRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public Bucket getDefaultBucket() {
        return bucketRepository.findByIsDefaultTrue()
                .orElse(null);
    }
}

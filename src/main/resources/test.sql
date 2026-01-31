select * from (
    select pqd.*, 
           ROW_NUMBER() OVER (PARTITION BY quota_ref ORDER BY major_version DESC) as rn
    from PRICING_QUOTA_DETAIL pqd 
    where quota_ref in ('716927.7',
        '726907.1',
        '704133.1',
        '697757.4',
        '697748.6',
        '720379.2',
        '693084.3',
        '701931.8',
        '708843.2',
        '728290.1')
) where rn = 1 
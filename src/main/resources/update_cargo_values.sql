-- Update COI_ASSIGNMENT_VALUATIONS table based on cost codes
-- This approach uses separate UPDATE statements to avoid the ORA-30926 error

-- Update CARGO_INCLUSIVE for cost codes C01 and I01
UPDATE COI_ASSIGNMENT_VALUATIONS cav
SET cav.CARGO_INCLUSIVE = (
    SELECT cost_versions.PROPOSED_FIXED_AMOUNT * (1 + cav.VAT_FACTOR)
    FROM coi_cost_versions cost_versions
    INNER JOIN coi_costs costs ON cost_versions.cost_id = costs.id AND cost_versions.latest_version = 1
    INNER JOIN coi_link_refs link_refs ON costs.link_ref_id = link_refs.id
    INNER JOIN coi_link_ref_versions clrv ON clrv.LINK_REF_ID = link_refs.id AND clrv.latest_version = 1
    INNER JOIN coi_cost_codes cost_codes ON cost_versions.cost_code_id = cost_codes.id
    INNER JOIN edm_log_assign_detail_cni_vw p ON link_refs.id = p.assignment_id
    INNER JOIN group_company_vw g ON p.group_company_id = g.id
    INNER JOIN country_vw c ON g.country_of_incorporation_id = c.id
    WHERE link_refs.id = cav.link_ref_id
    AND g.effective_to IS NULL AND c.effective_to IS NULL
    AND cost_codes.code IN ('C01', 'I01')
    AND costs.generated = 1
    AND cost_versions.state = 'New'
    AND link_refs.fl_code = 'RFML'
    AND cost_versions.latest_version = 1
    -- AND link_refs.external_ref_id='46.1.1' -- Uncomment this line to test with specific external_ref_id
)
WHERE cav.link_ref_id IN (
    SELECT link_refs.id
    FROM coi_link_refs link_refs
    INNER JOIN coi_costs costs ON costs.link_ref_id = link_refs.id
    INNER JOIN coi_cost_versions cost_versions ON cost_versions.cost_id = costs.id AND cost_versions.latest_version = 1
    INNER JOIN coi_cost_codes cost_codes ON cost_versions.cost_code_id = cost_codes.id
    WHERE cost_codes.code IN ('C01', 'I01')
    AND link_refs.fl_code = 'RFML'
    -- AND link_refs.external_ref_id='46.1.1' -- Uncomment this line to test with specific external_ref_id
);

-- Update CARGO_INCLUSIVE_PREMIUM for cost codes C01P and I01P
UPDATE COI_ASSIGNMENT_VALUATIONS cav
SET cav.CARGO_INCLUSIVE_PREMIUM = (
    SELECT cost_versions.PROPOSED_FIXED_AMOUNT * (1 + cav.VAT_FACTOR)
    FROM coi_cost_versions cost_versions
    INNER JOIN coi_costs costs ON cost_versions.cost_id = costs.id AND cost_versions.latest_version = 1
    INNER JOIN coi_link_refs link_refs ON costs.link_ref_id = link_refs.id
    INNER JOIN coi_link_ref_versions clrv ON clrv.LINK_REF_ID = link_refs.id AND clrv.latest_version = 1
    INNER JOIN coi_cost_codes cost_codes ON cost_versions.cost_code_id = cost_codes.id
    INNER JOIN edm_log_assign_detail_cni_vw p ON link_refs.id = p.assignment_id
    INNER JOIN group_company_vw g ON p.group_company_id = g.id
    INNER JOIN country_vw c ON g.country_of_incorporation_id = c.id
    WHERE link_refs.id = cav.link_ref_id
    AND g.effective_to IS NULL AND c.effective_to IS NULL
    AND cost_codes.code IN ('C01P', 'I01P')
    AND costs.generated = 1
    AND cost_versions.state = 'New'
    AND link_refs.fl_code = 'RFML'
    AND cost_versions.latest_version = 1
    -- AND link_refs.external_ref_id='46.1.1' -- Uncomment this line to test with specific external_ref_id
)
WHERE cav.link_ref_id IN (
    SELECT link_refs.id
    FROM coi_link_refs link_refs
    INNER JOIN coi_costs costs ON costs.link_ref_id = link_refs.id
    INNER JOIN coi_cost_versions cost_versions ON cost_versions.cost_id = costs.id AND cost_versions.latest_version = 1
    INNER JOIN coi_cost_codes cost_codes ON cost_versions.cost_code_id = cost_codes.id
    WHERE cost_codes.code IN ('C01P', 'I01P')
    AND link_refs.fl_code = 'RFML'
    -- AND link_refs.external_ref_id='46.1.1' -- Uncomment this line to test with specific external_ref_id
);

-- Update CARGO_INCLUSIVE_DISCOUNT for cost codes C01D and I01D
UPDATE COI_ASSIGNMENT_VALUATIONS cav
SET cav.CARGO_INCLUSIVE_DISCOUNT = (
    SELECT cost_versions.PROPOSED_FIXED_AMOUNT * (1 + cav.VAT_FACTOR)
    FROM coi_cost_versions cost_versions
    INNER JOIN coi_costs costs ON cost_versions.cost_id = costs.id AND cost_versions.latest_version = 1
    INNER JOIN coi_link_refs link_refs ON costs.link_ref_id = link_refs.id
    INNER JOIN coi_link_ref_versions clrv ON clrv.LINK_REF_ID = link_refs.id AND clrv.latest_version = 1
    INNER JOIN coi_cost_codes cost_codes ON cost_versions.cost_code_id = cost_codes.id
    INNER JOIN edm_log_assign_detail_cni_vw p ON link_refs.id = p.assignment_id
    INNER JOIN group_company_vw g ON p.group_company_id = g.id
    INNER JOIN country_vw c ON g.country_of_incorporation_id = c.id
    WHERE link_refs.id = cav.link_ref_id
    AND g.effective_to IS NULL AND c.effective_to IS NULL
    AND cost_codes.code IN ('C01D', 'I01D')
    AND costs.generated = 1
    AND cost_versions.state = 'New'
    AND link_refs.fl_code = 'RFML'
    AND cost_versions.latest_version = 1
    -- AND link_refs.external_ref_id='46.1.1' -- Uncomment this line to test with specific external_ref_id
)
WHERE cav.link_ref_id IN (
    SELECT link_refs.id
    FROM coi_link_refs link_refs
    INNER JOIN coi_costs costs ON costs.link_ref_id = link_refs.id
    INNER JOIN coi_cost_versions cost_versions ON cost_versions.cost_id = costs.id AND cost_versions.latest_version = 1
    INNER JOIN coi_cost_codes cost_codes ON cost_versions.cost_code_id = cost_codes.id
    WHERE cost_codes.code IN ('C01D', 'I01D')
    AND link_refs.fl_code = 'RFML'
    -- AND link_refs.external_ref_id='46.1.1' -- Uncomment this line to test with specific external_ref_id
);

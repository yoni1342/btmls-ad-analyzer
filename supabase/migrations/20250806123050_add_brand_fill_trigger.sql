-- Create the trigger function
CREATE OR REPLACE FUNCTION insert_brand_from_ad_account()
RETURNS TRIGGER AS $$
DECLARE
    v_brand_id bigint;
BEGIN
    -- Check if brand already exists
    SELECT id INTO v_brand_id
    FROM brands
    WHERE brand_name = NEW.brand_name;
    
    -- If brand doesn't exist, insert it
    IF v_brand_id IS NULL THEN
        INSERT INTO brands (brand_name)
        VALUES (NEW.brand_name)
        ON CONFLICT (brand_name) DO NOTHING
        RETURNING id INTO v_brand_id;
        
        -- Handle the case where another transaction inserted the brand
        -- between our SELECT and INSERT (race condition)
        IF v_brand_id IS NULL THEN
            SELECT id INTO v_brand_id
            FROM brands
            WHERE brand_name = NEW.brand_name;
        END IF;
    END IF;
    
    -- Set the brand_id in the ad_account record
    NEW.brand_id := v_brand_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER ad_account_brand_insert_trigger
BEFORE INSERT ON ad_account
FOR EACH ROW
EXECUTE FUNCTION insert_brand_from_ad_account();
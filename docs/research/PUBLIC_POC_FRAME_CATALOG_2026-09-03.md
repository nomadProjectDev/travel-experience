# Public PoC frame catalog — 2026-09-03

## Scope and evidence standard

This validation fixture contains nine exact Zenni Optical product/color records.
Zenni is the retailer and product owner for these listings; this is strong first-party
retail catalog evidence, but not independent laboratory or manufacturer evidence.
Each underlying product page was retrieved successfully and exposes the exact product
identifier, color, box size, lens height, retailer size label, and an explicit **Frame
Width** in millimeters. Search snippets were not used as measurement evidence.

Zenni's measurement guide defines frame width as a horizontal measurement across the
front that includes hinges or side features. The records preserve Zenni's term “Frame
Width”; none was calculated from `2 × lens width + bridge`.

The lower/middle/upper width cohort names are experimental dataset stratification for
this PoC only. They are not universal S/M/L boundaries and are not customer fit
recommendations. Zenni's own size label is preserved separately where published.

## Lower-width cohort

- **Zenni Pink Rectangle Glasses #688518**, exact Pink `46-18-126` variant.
  Published: A 46 mm; B 25 mm; bridge 18 mm; temple 126 mm; **Frame Width
  125 mm**; Zenni label X-Small. [Product evidence](https://www.zennioptical.com/p/womens-full-rim-stainless-steel-rectangle-eyeglass-frames/6885/688518).
  The page exposes an [official retailer product image](https://static.zennioptical.com/production/products/general/68/85/688518-eyeglasses-angle-view.jpg);
  its URL is research metadata only.
- **Zenni Black Rectangle Glasses #4441721**, exact Black `51-16-135`
  variant. Published: A 51 mm; B 37 mm; bridge 16 mm; temple 135 mm;
  **Frame Width 126 mm**; Zenni label Medium.
  [Product evidence](https://www.zennioptical.com/p/womens-acetate-rectangle-eyeglass-frames/44417/4441721).
  The page exposes an [official retailer product image](https://static.zennioptical.com/production/products/general/44/41/4441721-eyeglasses-front-view.jpg);
  its URL is research metadata only.
- **Zenni Gold Cat-Eye Glasses #3225114**, exact Gold `51-18-135` variant.
  Published: A 51 mm; B 43 mm; bridge 18 mm; temple 135 mm; **Frame Width
  127 mm**; Zenni label Medium. [Product evidence](https://www.zennioptical.com/p/womens-stainless-steel-cat-eye-eyeglass-frames/32251/3225114).
  The page exposes an [official retailer product image](https://static.zennioptical.com/production/products/general/32/25/3225114-eyeglasses-front-view.jpg);
  its URL is research metadata only.

## Middle-width cohort

- **Zenni Multi Travelers Glasses #4448939**, exact Multi `53-20-145`
  variant. Published: A 53 mm; B 45 mm; bridge 20 mm; temple 145 mm;
  **Frame Width 133 mm**; Zenni label Large.
  [Product evidence](https://www.zennioptical.com/p/acetate-square-eyeglass-frames/44489/4448939).
  The page exposes an [official retailer product image](https://static.zennioptical.com/production/products/general/44/48/4448939-eyeglasses-front-view.jpg);
  its URL is research metadata only.
- **Zenni Red Rectangle Glasses #827318**, exact Red `51-16-138` variant.
  Published: A 51 mm; B 23 mm; bridge 16 mm; temple 138 mm; **Frame Width
  135 mm**; Zenni label Medium. [Product evidence](https://www.zennioptical.com/p/plastic-full-rim-frame-with-sparkling-crystals/8273/827318).
  The page exposes an [official retailer product image](https://static.zennioptical.com/production/products/general/82/73/827318-eyeglasses-angle-view.jpg);
  its URL is research metadata only.
- **Zenni Black Rectangle Glasses #P1302421**, exact Black `54-17-145`
  variant. Published: A 54 mm; B 37 mm; bridge 17 mm; temple 145 mm;
  **Frame Width 137 mm**; Zenni label Large.
  [Product evidence](https://www.zennioptical.com/p/mens-halfrim-titanium-rectangle-eyeglass-frames/P13024/P1302421).
  The page exposes an [official retailer product image](https://static.zennioptical.com/production/products/general/P1/30/P1302421-eyeglasses-front-view.jpg);
  its URL is research metadata only.

## Upper-width cohort

- **Zenni Black Post Up Glasses #4443021**, exact Black `59-18-148`
  variant. Published: A 59 mm; B 39 mm; bridge 18 mm; temple 148 mm;
  **Frame Width 141 mm**; Zenni label X-Large.
  [Product evidence](https://www.zennioptical.com/p/mens-acetate-rectangle-eyeglass-frames/44430/4443021).
  The page exposes an [official retailer product image](https://static.zennioptical.com/production/products/general/44/43/4443021-eyeglasses-front-view.jpg);
  its URL is research metadata only.
- **Zenni Brown Rectangle Glasses #148115**, exact Brown `56-19-145`
  variant. Published: A 56 mm; B 34 mm; bridge 19 mm; temple 145 mm;
  **Frame Width 142 mm**; Zenni label X-Large.
  [Product evidence](https://www.zennioptical.com/p/mens-full-rim-mixed-materials-rectangle-eyeglass-frames/1481/148115).
  The page exposes an [official retailer product image](https://static.zennioptical.com/production/products/general/14/81/148115-eyeglasses-angle-view.jpg);
  its URL is research metadata only.
- **Zenni Grey Titletown Glasses #7829912**, exact Grey `56-21-147`
  variant. Published: A 56 mm; B 45 mm; bridge 21 mm; temple 147 mm;
  **Frame Width 144 mm**; Zenni label X-Large.
  [Product evidence](https://www.zennioptical.com/p/aviator-eyeglass-frames/78299/7829912).
  The page exposes an [official retailer product image](https://static.zennioptical.com/production/products/general/78/29/7829912-eyeglasses-front-view.jpg);
  its URL is research metadata only.

## Product boundary

All records have evidence class `exact` for the cited public product and
`catalogMatch: unverified` for the local app. They have no `wardrobeItemId` or
`wardrobeAnalogueId`, are not included in the client manifest, and cannot be returned
by the production wardrobe measurement resolver.

To make one selectable for visual try-on, the local catalog still needs an explicit
licensed product asset, the same brand/model/product ID/color/size metadata, permission
to use that asset, and a deliberate exact join. Physical-size ranking additionally
needs a validated absolute face-size signal and acceptance criteria; normalized face
ratios alone remain insufficient.

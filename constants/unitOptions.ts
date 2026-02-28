// constants/unitOptions.ts
type UnitOption = {
  value: string;
  label: string;
  base: number;        // Conversion to base unit (kg, l, m, piece)
  category: string;     // Category for filtering
  description: string;
  unitType: 'weight' | 'volume' | 'length' | 'piece' | 'pack'; // Main type
};

type UnitOptions = {
  [unitType: string]: UnitOption[];
};

export const UNIT_OPTIONS: UnitOptions = {
  weight: [
    // Base metric - base unit is KG
    { value: 'mg', label: 'Milligramme (mg)', base: 0.000001, category: 'metric', description: '1 mg = 0.000001 kg', unitType: 'weight' },
    { value: 'g', label: 'Gramme (g)', base: 0.001, category: 'metric', description: '1 g = 0.001 kg', unitType: 'weight' },
    { value: 'kg', label: 'Kilogramme (kg)', base: 1, category: 'metric', description: 'Unité standard (base)', unitType: 'weight' },
    { value: 'tonne', label: 'Tonne (t)', base: 1000, category: 'metric', description: '1 tonne = 1000 kg', unitType: 'weight' },
    { value: 'quintal', label: 'Quintal (q)', base: 100, category: 'metric', description: '1 quintal = 100 kg', unitType: 'weight' },
    
    // Food staples - sold in bags/sacks
    { value: 'sac_50kg', label: 'Sac 50kg', base: 50, category: 'bag', description: 'Sac standard de 50 kg', unitType: 'weight' },
    { value: 'sac_25kg', label: 'Sac 25kg', base: 25, category: 'bag', description: 'Sac de 25 kg', unitType: 'weight' },
    { value: 'sac_10kg', label: 'Sac 10kg', base: 10, category: 'bag', description: 'Sac de 10 kg', unitType: 'weight' },
    { value: 'sac_5kg', label: 'Sac 5kg', base: 5, category: 'bag', description: 'Sac de 5 kg', unitType: 'weight' },
    { value: 'sac_2kg', label: 'Sac 2kg', base: 2, category: 'bag', description: 'Sac de 2 kg', unitType: 'weight' },
    { value: 'sac_1kg', label: 'Sac 1kg', base: 1, category: 'bag', description: 'Sac de 1 kg', unitType: 'weight' },
    
    // Traditional measures (Burundi)
    { value: 'panier_10kg', label: 'Panier 10kg', base: 10, category: 'traditional', description: 'Petit panier traditionnel (≈10kg)', unitType: 'weight' },
    { value: 'panier_20kg', label: 'Panier 20kg', base: 20, category: 'traditional', description: 'Panier moyen (≈20kg)', unitType: 'weight' },
    { value: 'panier_30kg', label: 'Panier 30kg', base: 30, category: 'traditional', description: 'Grand panier (≈30kg)', unitType: 'weight' },
    { value: 'cageot_10kg', label: 'Cageot 10kg', base: 10, category: 'traditional', description: 'Petit cageot pour fruits/légumes', unitType: 'weight' },
    { value: 'cageot_20kg', label: 'Cageot 20kg', base: 20, category: 'traditional', description: 'Cageot moyen', unitType: 'weight' },
    { value: 'cageot_25kg', label: 'Cageot 25kg', base: 25, category: 'traditional', description: 'Grand cageot standard', unitType: 'weight' },
    
    // Construction materials
    { value: 'sac_ciment', label: 'Sac ciment 50kg', base: 50, category: 'construction', description: 'Sac de ciment standard 50kg', unitType: 'weight' },
    { value: 'brouette_sable', label: 'Brouette de sable', base: 50, category: 'construction', description: 'Brouette de sable (≈50kg)', unitType: 'weight' },
    { value: 'camionnette', label: 'Camionnette', base: 1000, category: 'construction', description: 'Camionnette de matériaux (≈1 tonne)', unitType: 'weight' },
    { value: 'camion_5t', label: 'Camion 5 tonnes', base: 5000, category: 'construction', description: 'Camion de 5 tonnes', unitType: 'weight' },
    { value: 'camion_10t', label: 'Camion 10 tonnes', base: 10000, category: 'construction', description: 'Camion de 10 tonnes', unitType: 'weight' },
  ],

  volume: [
    // Base metric - base unit is LITRE
    { value: 'ml', label: 'Millilitre (ml)', base: 0.001, category: 'metric', description: '1 ml = 0.001 L', unitType: 'volume' },
    { value: 'cl', label: 'Centilitre (cl)', base: 0.01, category: 'metric', description: '1 cl = 0.01 L', unitType: 'volume' },
    { value: 'dl', label: 'Décilitre (dl)', base: 0.1, category: 'metric', description: '1 dl = 0.1 L', unitType: 'volume' },
    { value: 'l', label: 'Litre (L)', base: 1, category: 'metric', description: 'Unité standard (base)', unitType: 'volume' },
    { value: 'hl', label: 'Hectolitre (hL)', base: 100, category: 'metric', description: '1 hL = 100 L', unitType: 'volume' },
    { value: 'm3', label: 'Mètre cube (m³)', base: 1000, category: 'metric', description: '1 m³ = 1000 L', unitType: 'volume' },
    
    // Individual bottles (each is a single unit with its volume)
    { value: 'bouteille_25cl', label: 'Bouteille 25cl', base: 0.25, category: 'bottle', description: 'Bouteille individuelle de 25cl', unitType: 'volume' },
    { value: 'bouteille_33cl', label: 'Bouteille 33cl', base: 0.33, category: 'bottle', description: 'Bouteille individuelle de 33cl', unitType: 'volume' },
    { value: 'bouteille_50cl', label: 'Bouteille 50cl', base: 0.5, category: 'bottle', description: 'Bouteille individuelle de 50cl', unitType: 'volume' },
    { value: 'bouteille_75cl', label: 'Bouteille 75cl', base: 0.75, category: 'bottle', description: 'Bouteille individuelle de 75cl', unitType: 'volume' },
    { value: 'bouteille_1l', label: 'Bouteille 1L', base: 1, category: 'bottle', description: 'Bouteille individuelle de 1L', unitType: 'volume' },
    { value: 'bouteille_1_5l', label: 'Bouteille 1.5L', base: 1.5, category: 'bottle', description: 'Bouteille individuelle de 1.5L', unitType: 'volume' },
    { value: 'bouteille_2l', label: 'Bouteille 2L', base: 2, category: 'bottle', description: 'Bouteille individuelle de 2L', unitType: 'volume' },
    
    // Individual cans
    { value: 'canette_25cl', label: 'Canette 25cl', base: 0.25, category: 'can', description: 'Canette individuelle de 25cl', unitType: 'volume' },
    { value: 'canette_33cl', label: 'Canette 33cl', base: 0.33, category: 'can', description: 'Canette individuelle de 33cl', unitType: 'volume' },
    { value: 'canette_50cl', label: 'Canette 50cl', base: 0.5, category: 'can', description: 'Canette individuelle de 50cl', unitType: 'volume' },
    
    // Containers (large volume containers)
    { value: 'bidon_5l', label: 'Bidon 5L', base: 5, category: 'container', description: 'Bidon de 5 litres', unitType: 'volume' },
    { value: 'bidon_10l', label: 'Bidon 10L', base: 10, category: 'container', description: 'Bidon de 10 litres', unitType: 'volume' },
    { value: 'bidon_20l', label: 'Bidon 20L', base: 20, category: 'container', description: 'Bidon de 20 litres', unitType: 'volume' },
    { value: 'bidon_25l', label: 'Bidon 25L', base: 25, category: 'container', description: 'Bidon de 25 litres', unitType: 'volume' },
    { value: 'bidon_50l', label: 'Bidon 50L', base: 50, category: 'container', description: 'Bidon de 50 litres', unitType: 'volume' },
    
    { value: 'fut_30l', label: 'Fût 30L', base: 30, category: 'barrel', description: 'Fût de 30 litres', unitType: 'volume' },
    { value: 'fut_50l', label: 'Fût 50L', base: 50, category: 'barrel', description: 'Fût de 50 litres', unitType: 'volume' },
    { value: 'fut_100l', label: 'Fût 100L', base: 100, category: 'barrel', description: 'Fût de 100 litres', unitType: 'volume' },
    { value: 'fut_200l', label: 'Fût 200L', base: 200, category: 'barrel', description: 'Fût de 200 litres', unitType: 'volume' },
    
    { value: 'jerrican_5l', label: 'Jerrican 5L', base: 5, category: 'jerrican', description: 'Jerrican de 5 litres', unitType: 'volume' },
    { value: 'jerrican_10l', label: 'Jerrican 10L', base: 10, category: 'jerrican', description: 'Jerrican de 10 litres', unitType: 'volume' },
    { value: 'jerrican_20l', label: 'Jerrican 20L', base: 20, category: 'jerrican', description: 'Jerrican de 20 litres', unitType: 'volume' },
    
    { value: 'seau_10l', label: 'Seau 10L', base: 10, category: 'bucket', description: 'Seau de 10 litres', unitType: 'volume' },
    { value: 'seau_15l', label: 'Seau 15L', base: 15, category: 'bucket', description: 'Seau de 15 litres', unitType: 'volume' },
    { value: 'seau_20l', label: 'Seau 20L', base: 20, category: 'bucket', description: 'Seau de 20 litres', unitType: 'volume' },
    
    { value: 'cuvette_10l', label: 'Cuvette 10L', base: 10, category: 'basin', description: 'Cuvette de 10 litres', unitType: 'volume' },
    { value: 'cuvette_20l', label: 'Cuvette 20L', base: 20, category: 'basin', description: 'Cuvette de 20 litres', unitType: 'volume' },
    { value: 'cuvette_30l', label: 'Cuvette 30L', base: 30, category: 'basin', description: 'Cuvette de 30 litres', unitType: 'volume' },
    
    { value: 'bassine_15l', label: 'Bassine 15L', base: 15, category: 'basin', description: 'Bassine de 15 litres', unitType: 'volume' },
    { value: 'bassine_25l', label: 'Bassine 25L', base: 25, category: 'basin', description: 'Bassine de 25 litres', unitType: 'volume' },
    { value: 'bassine_40l', label: 'Bassine 40L', base: 40, category: 'basin', description: 'Bassine de 40 litres', unitType: 'volume' },
    
    // Agricultural containers
    { value: 'pulverisateur_10l', label: 'Pulvérisateur 10L', base: 10, category: 'agriculture', description: 'Pulvérisateur de 10 litres', unitType: 'volume' },
    { value: 'pulverisateur_15l', label: 'Pulvérisateur 15L', base: 15, category: 'agriculture', description: 'Pulvérisateur de 15 litres', unitType: 'volume' },
    { value: 'pulverisateur_20l', label: 'Pulvérisateur 20L', base: 20, category: 'agriculture', description: 'Pulvérisateur de 20 litres', unitType: 'volume' },
    { value: 'arrosoir_10l', label: 'Arrosoir 10L', base: 10, category: 'agriculture', description: 'Arrosoir de 10 litres', unitType: 'volume' },
    
    // Bulk storage
    { value: 'citerne_1000l', label: 'Citerne 1000L', base: 1000, category: 'bulk', description: 'Citerne de 1000 litres (1m³)', unitType: 'volume' },
    { value: 'citerne_5000l', label: 'Citerne 5000L', base: 5000, category: 'bulk', description: 'Citerne de 5000 litres (5m³)', unitType: 'volume' },
    { value: 'citerne_10000l', label: 'Citerne 10000L', base: 10000, category: 'bulk', description: 'Citerne de 10000 litres (10m³)', unitType: 'volume' },
    { value: 'camion_citerne', label: 'Camion-citerne', base: 30000, category: 'bulk', description: 'Camion-citerne (≈30000L)', unitType: 'volume' },
  ],

  length: [
    // Base metric - base unit is METRE
    { value: 'mm', label: 'Millimètre (mm)', base: 0.001, category: 'metric', description: '1 mm = 0.001 m', unitType: 'length' },
    { value: 'cm', label: 'Centimètre (cm)', base: 0.01, category: 'metric', description: '1 cm = 0.01 m', unitType: 'length' },
    { value: 'dm', label: 'Décimètre (dm)', base: 0.1, category: 'metric', description: '1 dm = 0.1 m', unitType: 'length' },
    { value: 'm', label: 'Mètre (m)', base: 1, category: 'metric', description: 'Unité standard (base)', unitType: 'length' },
    { value: 'dam', label: 'Décamètre (dam)', base: 10, category: 'metric', description: '1 dam = 10 m', unitType: 'length' },
    { value: 'hm', label: 'Hectomètre (hm)', base: 100, category: 'metric', description: '1 hm = 100 m', unitType: 'length' },
    { value: 'km', label: 'Kilomètre (km)', base: 1000, category: 'metric', description: '1 km = 1000 m', unitType: 'length' },
    
    // Textiles (individual pieces with standard lengths)
    { value: 'pagne_1_5m', label: 'Pagne 1.5m', base: 1.5, category: 'textile', description: 'Pagne de 1.5 mètres', unitType: 'length' },
    { value: 'pagne_1_8m', label: 'Pagne 1.8m', base: 1.8, category: 'textile', description: 'Pagne standard de 1.8 mètres', unitType: 'length' },
    { value: 'pagne_2m', label: 'Pagne 2m', base: 2, category: 'textile', description: 'Grand pagne de 2 mètres', unitType: 'length' },
    
    { value: 'kitenge_2m', label: 'Kitenge 2m', base: 2, category: 'textile', description: 'Kitenge standard de 2 mètres', unitType: 'length' },
    { value: 'kitenge_2_5m', label: 'Kitenge 2.5m', base: 2.5, category: 'textile', description: 'Grand kitenge de 2.5 mètres', unitType: 'length' },
    
    // Sold by the metre (continuous)
    { value: 'tissu_m', label: 'Tissu au mètre', base: 1, category: 'textile', description: 'Tissu vendu au mètre', unitType: 'length' },
    { value: 'coton_m', label: 'Coton au mètre', base: 1, category: 'textile', description: 'Coton vendu au mètre', unitType: 'length' },
    { value: 'soie_m', label: 'Soie au mètre', base: 1, category: 'textile', description: 'Soie vendue au mètre', unitType: 'length' },
    { value: 'laine_m', label: 'Laine au mètre', base: 1, category: 'textile', description: 'Laine vendue au mètre', unitType: 'length' },
    
    // Ribbons and trims
    { value: 'ruban_m', label: 'Ruban au mètre', base: 1, category: 'textile', description: 'Ruban vendu au mètre', unitType: 'length' },
    { value: 'dentelle_m', label: 'Dentelle au mètre', base: 1, category: 'textile', description: 'Dentelle vendue au mètre', unitType: 'length' },
    
    // Cables and wires (sold by the metre)
    { value: 'cable_electrique_m', label: 'Câble électrique (m)', base: 1, category: 'electrical', description: 'Câble électrique au mètre', unitType: 'length' },
    { value: 'fil_electrique_m', label: 'Fil électrique (m)', base: 1, category: 'electrical', description: 'Fil électrique au mètre', unitType: 'length' },
    { value: 'cable_antenne_m', label: 'Câble antenne (m)', base: 1, category: 'electrical', description: 'Câble d\'antenne au mètre', unitType: 'length' },
    { value: 'cable_ethernet_m', label: 'Câble Ethernet (m)', base: 1, category: 'electrical', description: 'Câble Ethernet au mètre', unitType: 'length' },
    { value: 'cable_hdmi_m', label: 'Câble HDMI (m)', base: 1, category: 'electrical', description: 'Câble HDMI au mètre', unitType: 'length' },
    
    // Threads and ropes (sold by the metre)
    { value: 'fil_couture_m', label: 'Fil à coudre (m)', base: 1, category: 'sewing', description: 'Fil à coudre au mètre', unitType: 'length' },
    { value: 'fil_broderie_m', label: 'Fil à broder (m)', base: 1, category: 'sewing', description: 'Fil à broder au mètre', unitType: 'length' },
    { value: 'fil_peche_m', label: 'Fil de pêche (m)', base: 1, category: 'fishing', description: 'Fil de pêche au mètre', unitType: 'length' },
    { value: 'corde_m', label: 'Corde (m)', base: 1, category: 'hardware', description: 'Corde au mètre', unitType: 'length' },
    { value: 'ficelle_m', label: 'Ficelle (m)', base: 1, category: 'hardware', description: 'Ficelle au mètre', unitType: 'length' },
    
    // Pipes and tubes (sold by the metre)
    { value: 'tuyau_m', label: 'Tuyau (m)', base: 1, category: 'plumbing', description: 'Tuyau au mètre', unitType: 'length' },
    { value: 'tuyau_arrosage_m', label: 'Tuyau d\'arrosage (m)', base: 1, category: 'garden', description: 'Tuyau d\'arrosage au mètre', unitType: 'length' },
    { value: 'tube_pvc_m', label: 'Tube PVC (m)', base: 1, category: 'plumbing', description: 'Tube PVC au mètre', unitType: 'length' },
    { value: 'tube_cuivre_m', label: 'Tube cuivre (m)', base: 1, category: 'plumbing', description: 'Tube cuivre au mètre', unitType: 'length' },
    
    // Wood and lumber (sold by the metre)
    { value: 'planche_m', label: 'Planche (m)', base: 1, category: 'wood', description: 'Planche de bois au mètre', unitType: 'length' },
    { value: 'poutre_m', label: 'Poutre (m)', base: 1, category: 'wood', description: 'Poutre en bois au mètre', unitType: 'length' },
    { value: 'madrier_m', label: 'Madrier (m)', base: 1, category: 'wood', description: 'Madrier au mètre', unitType: 'length' },
    { value: 'chevron_m', label: 'Chevron (m)', base: 1, category: 'wood', description: 'Chevron au mètre', unitType: 'length' },
    { value: 'baguette_m', label: 'Baguette (m)', base: 1, category: 'wood', description: 'Baguette en bois au mètre', unitType: 'length' },
    { value: 'moulure_m', label: 'Moulure (m)', base: 1, category: 'decoration', description: 'Moulure au mètre', unitType: 'length' },
    { value: 'plinthe_m', label: 'Plinthe (m)', base: 1, category: 'construction', description: 'Plinthe au mètre', unitType: 'length' },
    
    // Rolls (pre-cut lengths)
    { value: 'rouleau_10m', label: 'Rouleau 10m', base: 10, category: 'roll', description: 'Rouleau de 10 mètres', unitType: 'length' },
    { value: 'rouleau_20m', label: 'Rouleau 20m', base: 20, category: 'roll', description: 'Rouleau de 20 mètres', unitType: 'length' },
    { value: 'rouleau_30m', label: 'Rouleau 30m', base: 30, category: 'roll', description: 'Rouleau de 30 mètres', unitType: 'length' },
    { value: 'rouleau_50m', label: 'Rouleau 50m', base: 50, category: 'roll', description: 'Rouleau de 50 mètres', unitType: 'length' },
    { value: 'rouleau_100m', label: 'Rouleau 100m', base: 100, category: 'roll', description: 'Rouleau de 100 mètres', unitType: 'length' },
    
    // Pre-cut lengths
    { value: 'barre_fer_6m', label: 'Barre fer 6m', base: 6, category: 'construction', description: 'Barre de fer de 6 mètres', unitType: 'length' },
    { value: 'barre_fer_8m', label: 'Barre fer 8m', base: 8, category: 'construction', description: 'Barre de fer de 8 mètres', unitType: 'length' },
    { value: 'barre_fer_10m', label: 'Barre fer 10m', base: 10, category: 'construction', description: 'Barre de fer de 10 mètres', unitType: 'length' },
    { value: 'barre_fer_12m', label: 'Barre fer 12m', base: 12, category: 'construction', description: 'Barre de fer de 12 mètres', unitType: 'length' },
    
    { value: 'tuyau_pvc_3m', label: 'Tube PVC 3m', base: 3, category: 'plumbing', description: 'Tube PVC de 3 mètres', unitType: 'length' },
    { value: 'tuyau_pvc_4m', label: 'Tube PVC 4m', base: 4, category: 'plumbing', description: 'Tube PVC de 4 mètres', unitType: 'length' },
    { value: 'tuyau_pvc_6m', label: 'Tube PVC 6m', base: 6, category: 'plumbing', description: 'Tube PVC de 6 mètres', unitType: 'length' },
    
    // Fencing
    { value: 'grillage_m', label: 'Grillage (m)', base: 1, category: 'fencing', description: 'Grillage au mètre', unitType: 'length' },
    { value: 'fil_barbelé_m', label: 'Fil barbelé (m)', base: 1, category: 'fencing', description: 'Fil barbelé au mètre', unitType: 'length' },
    { value: 'grillage_rouleau_25m', label: 'Rouleau grillage 25m', base: 25, category: 'fencing', description: 'Rouleau de grillage de 25 mètres', unitType: 'length' },
    { value: 'grillage_rouleau_50m', label: 'Rouleau grillage 50m', base: 50, category: 'fencing', description: 'Rouleau de grillage de 50 mètres', unitType: 'length' },
  ],

  piece: [
    // Basic - base unit is PIECE
    { value: 'piece', label: 'Pièce', base: 1, category: 'basic', description: 'Unité individuelle (base)', unitType: 'piece' },
    { value: 'unite', label: 'Unité', base: 1, category: 'basic', description: 'Unité standard', unitType: 'piece' },
    
    // Individual containers (each is 1 piece)
    { value: 'bouteille', label: 'Bouteille', base: 1, category: 'container', description: 'Bouteille individuelle (contenant)', unitType: 'piece' },
    { value: 'canette', label: 'Canette', base: 1, category: 'container', description: 'Canette individuelle', unitType: 'piece' },
    { value: 'sachet', label: 'Sachet', base: 1, category: 'packaging', description: 'Sachet individuel', unitType: 'piece' },
    { value: 'tetra_pack', label: 'Tetra Pak', base: 1, category: 'packaging', description: 'Emballage Tetra Pak individuel', unitType: 'piece' },
    { value: 'gourde', label: 'Gourde', base: 1, category: 'container', description: 'Gourde réutilisable', unitType: 'piece' },
    { value: 'thermos', label: 'Thermos', base: 1, category: 'container', description: 'Thermos', unitType: 'piece' },
    
    // Empty boxes/containers (the container itself is 1 piece)
    { value: 'boite_vide', label: 'Boîte vide', base: 1, category: 'packaging', description: 'Boîte vide (contenant)', unitType: 'piece' },
    { value: 'carton_vide', label: 'Carton vide', base: 1, category: 'packaging', description: 'Carton vide (contenant)', unitType: 'piece' },
    { value: 'caisse_vide', label: 'Caisse vide', base: 1, category: 'packaging', description: 'Caisse vide', unitType: 'piece' },
    
    // Clothing - individual items
    { value: 'chemise', label: 'Chemise', base: 1, category: 'clothing', description: 'Chemise individuelle', unitType: 'piece' },
    { value: 'pantalon', label: 'Pantalon', base: 1, category: 'clothing', description: 'Pantalon individuel', unitType: 'piece' },
    { value: 'robe', label: 'Robe', base: 1, category: 'clothing', description: 'Robe individuelle', unitType: 'piece' },
    { value: 'jupe', label: 'Jupe', base: 1, category: 'clothing', description: 'Jupe individuelle', unitType: 'piece' },
    { value: 'veste', label: 'Veste', base: 1, category: 'clothing', description: 'Veste individuelle', unitType: 'piece' },
    { value: 'costume', label: 'Costume', base: 1, category: 'clothing', description: 'Costume complet (veste+pantalon)', unitType: 'piece' },
    
    // Footwear
    { value: 'chaussure_gauche', label: 'Chaussure gauche', base: 1, category: 'footwear', description: 'Chaussure individuelle (gauche)', unitType: 'piece' },
    { value: 'chaussure_droite', label: 'Chaussure droite', base: 1, category: 'footwear', description: 'Chaussure individuelle (droite)', unitType: 'piece' },
    { value: 'paire_chaussures', label: 'Paire de chaussures', base: 2, category: 'footwear', description: 'Paire de chaussures (2 pièces)', unitType: 'piece' },
    
    { value: 'chaussette', label: 'Chaussette', base: 1, category: 'clothing', description: 'Chaussette individuelle', unitType: 'piece' },
    { value: 'paire_chaussettes', label: 'Paire de chaussettes', base: 2, category: 'clothing', description: 'Paire de chaussettes (2 pièces)', unitType: 'piece' },
    
    // Electronics - individual items
    { value: 'telephone', label: 'Téléphone', base: 1, category: 'electronics', description: 'Téléphone individuel', unitType: 'piece' },
    { value: 'chargeur', label: 'Chargeur', base: 1, category: 'electronics', description: 'Chargeur individuel', unitType: 'piece' },
    { value: 'batterie', label: 'Batterie', base: 1, category: 'electronics', description: 'Batterie individuelle', unitType: 'piece' },
    { value: 'cable', label: 'Câble', base: 1, category: 'electronics', description: 'Câble individuel', unitType: 'piece' },
    { value: 'adaptateur', label: 'Adaptateur', base: 1, category: 'electronics', description: 'Adaptateur individuel', unitType: 'piece' },
    { value: 'lampe', label: 'Lampe', base: 1, category: 'electronics', description: 'Lampe individuelle', unitType: 'piece' },
    { value: 'ampoule', label: 'Ampoule', base: 1, category: 'electronics', description: 'Ampoule individuelle', unitType: 'piece' },
    { value: 'radio', label: 'Radio', base: 1, category: 'electronics', description: 'Radio individuelle', unitType: 'piece' },
    { value: 'television', label: 'Téléviseur', base: 1, category: 'electronics', description: 'Téléviseur individuel', unitType: 'piece' },
    
    // Household items - individual
    { value: 'savon', label: 'Savon', base: 1, category: 'household', description: 'Savon individuel', unitType: 'piece' },
    { value: 'savonnette', label: 'Savonnette', base: 1, category: 'household', description: 'Petit savon individuel', unitType: 'piece' },
    { value: 'dentifrice', label: 'Dentifrice', base: 1, category: 'household', description: 'Tube de dentifrice', unitType: 'piece' },
    { value: 'brosse_dents', label: 'Brosse à dents', base: 1, category: 'household', description: 'Brosse à dents individuelle', unitType: 'piece' },
    { value: 'serviette', label: 'Serviette', base: 1, category: 'household', description: 'Serviette de bain', unitType: 'piece' },
    { value: 'torchon', label: 'Torchon', base: 1, category: 'household', description: 'Torchon de cuisine', unitType: 'piece' },
    { value: 'eponge', label: 'Éponge', base: 1, category: 'household', description: 'Éponge individuelle', unitType: 'piece' },
    
    // Kitchen items - individual
    { value: 'plat', label: 'Plat', base: 1, category: 'kitchen', description: 'Plat de service', unitType: 'piece' },
    { value: 'assiette', label: 'Assiette', base: 1, category: 'kitchen', description: 'Assiette individuelle', unitType: 'piece' },
    { value: 'verre', label: 'Verre', base: 1, category: 'kitchen', description: 'Verre individuel', unitType: 'piece' },
    { value: 'tasse', label: 'Tasse', base: 1, category: 'kitchen', description: 'Tasse individuelle', unitType: 'piece' },
    { value: 'casserole', label: 'Casserole', base: 1, category: 'kitchen', description: 'Casserole individuelle', unitType: 'piece' },
    { value: 'poele', label: 'Poêle', base: 1, category: 'kitchen', description: 'Poêle individuelle', unitType: 'piece' },
    { value: 'couteau', label: 'Couteau', base: 1, category: 'kitchen', description: 'Couteau individuel', unitType: 'piece' },
    { value: 'fourchette', label: 'Fourchette', base: 1, category: 'kitchen', description: 'Fourchette individuelle', unitType: 'piece' },
    { value: 'cuillere', label: 'Cuillère', base: 1, category: 'kitchen', description: 'Cuillère individuelle', unitType: 'piece' },
    
    // Stationery - individual
    { value: 'stylo', label: 'Stylo', base: 1, category: 'stationery', description: 'Stylo individuel', unitType: 'piece' },
    { value: 'crayon', label: 'Crayon', base: 1, category: 'stationery', description: 'Crayon individuel', unitType: 'piece' },
    { value: 'cahier', label: 'Cahier', base: 1, category: 'stationery', description: 'Cahier individuel', unitType: 'piece' },
    { value: 'livre', label: 'Livre', base: 1, category: 'stationery', description: 'Livre individuel', unitType: 'piece' },
    { value: 'regle', label: 'Règle', base: 1, category: 'stationery', description: 'Règle individuelle', unitType: 'piece' },
    { value: 'gomme', label: 'Gomme', base: 1, category: 'stationery', description: 'Gomme individuelle', unitType: 'piece' },
    { value: 'taille_crayon', label: 'Taille-crayon', base: 1, category: 'stationery', description: 'Taille-crayon individuel', unitType: 'piece' },
    { value: 'ciseaux', label: 'Ciseaux', base: 1, category: 'stationery', description: 'Ciseaux individuels', unitType: 'piece' },
    { value: 'colle', label: 'Colle', base: 1, category: 'stationery', description: 'Tube de colle individuel', unitType: 'piece' },
    
    // Agriculture - individual
    { value: 'graine', label: 'Graine', base: 1, category: 'agriculture', description: 'Graine individuelle', unitType: 'piece' },
    { value: 'plant', label: 'Plant', base: 1, category: 'agriculture', description: 'Jeune plant individuel', unitType: 'piece' },
    { value: 'bouture', label: 'Bouture', base: 1, category: 'agriculture', description: 'Bouture individuelle', unitType: 'piece' },
    { value: 'rejet', label: 'Rejet', base: 1, category: 'agriculture', description: 'Rejet de bananier', unitType: 'piece' },
    
    // Livestock - individual animals
    { value: 'tête', label: 'Tête', base: 1, category: 'livestock', description: 'Animal individuel', unitType: 'piece' },
    { value: 'vache', label: 'Vache', base: 1, category: 'livestock', description: 'Vache individuelle', unitType: 'piece' },
    { value: 'taureau', label: 'Taureau', base: 1, category: 'livestock', description: 'Taureau individuel', unitType: 'piece' },
    { value: 'veau', label: 'Veau', base: 1, category: 'livestock', description: 'Veau individuel', unitType: 'piece' },
    { value: 'chèvre', label: 'Chèvre', base: 1, category: 'livestock', description: 'Chèvre individuelle', unitType: 'piece' },
    { value: 'mouton', label: 'Mouton', base: 1, category: 'livestock', description: 'Mouton individuel', unitType: 'piece' },
    { value: 'porc', label: 'Porc', base: 1, category: 'livestock', description: 'Porc individuel', unitType: 'piece' },
    { value: 'poulet', label: 'Poulet', base: 1, category: 'livestock', description: 'Poulet individuel', unitType: 'piece' },
    { value: 'poussin', label: 'Poussin', base: 1, category: 'livestock', description: 'Poussin individuel', unitType: 'piece' },
    { value: 'lapin', label: 'Lapin', base: 1, category: 'livestock', description: 'Lapin individuel', unitType: 'piece' },
    
    // Pairs and groups
    { value: 'couple', label: 'Couple', base: 2, category: 'group', description: 'Couple (2 animaux)', unitType: 'piece' },
    { value: 'troupeau', label: 'Troupeau', base: 10, category: 'group', description: 'Troupeau (10 têtes)', unitType: 'piece' },
    { value: 'portée', label: 'Portée', base: 5, category: 'group', description: 'Portée de petits (5)', unitType: 'piece' },
  ],

  pack: [
    // Multi-packs (each contains multiple pieces) - base unit is PIECES contained
    { value: 'pack_1', label: 'Pack de 1', base: 1, category: 'pack', description: 'Lot de 1 article', unitType: 'pack' },
    { value: 'pack_2', label: 'Pack de 2', base: 2, category: 'pack', description: 'Lot de 2 articles', unitType: 'pack' },
    { value: 'pack_3', label: 'Pack de 3', base: 3, category: 'pack', description: 'Lot de 3 articles', unitType: 'pack' },
    { value: 'pack_4', label: 'Pack de 4', base: 4, category: 'pack', description: 'Lot de 4 articles', unitType: 'pack' },
    { value: 'pack_5', label: 'Pack de 5', base: 5, category: 'pack', description: 'Lot de 5 articles', unitType: 'pack' },
    { value: 'pack_6', label: 'Pack de 6', base: 6, category: 'pack', description: 'Lot de 6 articles', unitType: 'pack' },
    { value: 'pack_8', label: 'Pack de 8', base: 8, category: 'pack', description: 'Lot de 8 articles', unitType: 'pack' },
    { value: 'pack_10', label: 'Pack de 10', base: 10, category: 'pack', description: 'Lot de 10 articles', unitType: 'pack' },
    { value: 'pack_12', label: 'Douzaine', base: 12, category: 'pack', description: 'Lot de 12 articles', unitType: 'pack' },
    { value: 'pack_15', label: 'Pack de 15', base: 15, category: 'pack', description: 'Lot de 15 articles', unitType: 'pack' },
    { value: 'pack_18', label: 'Pack de 18', base: 18, category: 'pack', description: 'Lot de 18 articles', unitType: 'pack' },
    { value: 'pack_20', label: 'Pack de 20', base: 20, category: 'pack', description: 'Lot de 20 articles', unitType: 'pack' },
    { value: 'pack_24', label: 'Pack de 24', base: 24, category: 'pack', description: 'Lot de 24 articles (2 douzaines)', unitType: 'pack' },
    { value: 'pack_25', label: 'Pack de 25', base: 25, category: 'pack', description: 'Lot de 25 articles', unitType: 'pack' },
    { value: 'pack_30', label: 'Pack de 30', base: 30, category: 'pack', description: 'Lot de 30 articles', unitType: 'pack' },
    { value: 'pack_36', label: 'Pack de 36', base: 36, category: 'pack', description: 'Lot de 36 articles (3 douzaines)', unitType: 'pack' },
    { value: 'pack_40', label: 'Pack de 40', base: 40, category: 'pack', description: 'Lot de 40 articles', unitType: 'pack' },
    { value: 'pack_48', label: 'Pack de 48', base: 48, category: 'pack', description: 'Lot de 48 articles (4 douzaines)', unitType: 'pack' },
    { value: 'pack_50', label: 'Pack de 50', base: 50, category: 'pack', description: 'Lot de 50 articles', unitType: 'pack' },
    { value: 'pack_60', label: 'Pack de 60', base: 60, category: 'pack', description: 'Lot de 60 articles (5 douzaines)', unitType: 'pack' },
    { value: 'pack_72', label: 'Pack de 72', base: 72, category: 'pack', description: 'Lot de 72 articles (6 douzaines)', unitType: 'pack' },
    { value: 'pack_100', label: 'Pack de 100', base: 100, category: 'pack', description: 'Lot de 100 articles (centaine)', unitType: 'pack' },
    
    // Boxes (containers with multiple items)
    { value: 'boite_3', label: 'Boîte de 3', base: 3, category: 'box', description: 'Boîte contenant 3 articles', unitType: 'pack' },
    { value: 'boite_6', label: 'Boîte de 6', base: 6, category: 'box', description: 'Boîte contenant 6 articles', unitType: 'pack' },
    { value: 'boite_12', label: 'Boîte de 12', base: 12, category: 'box', description: 'Boîte contenant 12 articles', unitType: 'pack' },
    { value: 'boite_24', label: 'Boîte de 24', base: 24, category: 'box', description: 'Boîte contenant 24 articles', unitType: 'pack' },
    { value: 'boite_48', label: 'Boîte de 48', base: 48, category: 'box', description: 'Boîte contenant 48 articles', unitType: 'pack' },
    
    // Cartons (large containers)
    { value: 'carton_6', label: 'Carton de 6', base: 6, category: 'carton', description: 'Carton contenant 6 articles', unitType: 'pack' },
    { value: 'carton_12', label: 'Carton de 12', base: 12, category: 'carton', description: 'Carton contenant 12 articles', unitType: 'pack' },
    { value: 'carton_24', label: 'Carton de 24', base: 24, category: 'carton', description: 'Carton contenant 24 articles', unitType: 'pack' },
    { value: 'carton_36', label: 'Carton de 36', base: 36, category: 'carton', description: 'Carton contenant 36 articles', unitType: 'pack' },
    { value: 'carton_48', label: 'Carton de 48', base: 48, category: 'carton', description: 'Carton contenant 48 articles', unitType: 'pack' },
    { value: 'carton_50', label: 'Carton de 50', base: 50, category: 'carton', description: 'Carton contenant 50 articles', unitType: 'pack' },
    { value: 'carton_72', label: 'Carton de 72', base: 72, category: 'carton', description: 'Carton contenant 72 articles', unitType: 'pack' },
    { value: 'carton_100', label: 'Carton de 100', base: 100, category: 'carton', description: 'Carton contenant 100 articles', unitType: 'pack' },
    
    // Crates
    { value: 'caisse_12', label: 'Caisse de 12', base: 12, category: 'crate', description: 'Caisse contenant 12 articles', unitType: 'pack' },
    { value: 'caisse_24', label: 'Caisse de 24', base: 24, category: 'crate', description: 'Caisse contenant 24 articles', unitType: 'pack' },
    { value: 'caisse_25', label: 'Caisse de 25', base: 25, category: 'crate', description: 'Caisse contenant 25 articles', unitType: 'pack' },
    { value: 'caisse_50', label: 'Caisse de 50', base: 50, category: 'crate', description: 'Caisse contenant 50 articles', unitType: 'pack' },
    { value: 'caisse_100', label: 'Caisse de 100', base: 100, category: 'crate', description: 'Caisse contenant 100 articles', unitType: 'pack' },
    
    // Sacks (for piece items)
    { value: 'sac_10pcs', label: 'Sac de 10 pièces', base: 10, category: 'bag', description: 'Sac contenant 10 articles', unitType: 'pack' },
    { value: 'sac_25pcs', label: 'Sac de 25 pièces', base: 25, category: 'bag', description: 'Sac contenant 25 articles', unitType: 'pack' },
    { value: 'sac_50pcs', label: 'Sac de 50 pièces', base: 50, category: 'bag', description: 'Sac contenant 50 articles', unitType: 'pack' },
    { value: 'sac_100pcs', label: 'Sac de 100 pièces', base: 100, category: 'bag', description: 'Sac contenant 100 articles', unitType: 'pack' },
    
    // Pallets (very large)
    { value: 'palette_500', label: 'Palette (500 pièces)', base: 500, category: 'pallet', description: 'Palette de 500 articles', unitType: 'pack' },
    { value: 'palette_1000', label: 'Palette (1000 pièces)', base: 1000, category: 'pallet', description: 'Palette de 1000 articles', unitType: 'pack' },
    { value: 'demi_palette', label: 'Demi-palette (250 pièces)', base: 250, category: 'pallet', description: 'Demi-palette de 250 articles', unitType: 'pack' },
    { value: 'quart_palette', label: 'Quart de palette (125 pièces)', base: 125, category: 'pallet', description: 'Quart de palette de 125 articles', unitType: 'pack' },
    
    // Containers (shipping)
    { value: 'conteneur_20', label: 'Conteneur 20\'', base: 10000, category: 'container', description: 'Conteneur 20 pieds (≈10000 pièces)', unitType: 'pack' },
    { value: 'conteneur_40', label: 'Conteneur 40\'', base: 20000, category: 'container', description: 'Conteneur 40 pieds (≈20000 pièces)', unitType: 'pack' },
    
    // Wholesale lots
    { value: 'demi_gros', label: 'Demi-gros', base: 25, category: 'wholesale', description: 'Lot demi-gros (25 pièces)', unitType: 'pack' },
    { value: 'gros', label: 'Gros', base: 50, category: 'wholesale', description: 'Lot gros (50 pièces)', unitType: 'pack' },
    { value: 'super_gros', label: 'Super gros', base: 100, category: 'wholesale', description: 'Lot super gros (100 pièces)', unitType: 'pack' },
  ],
};
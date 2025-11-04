-- SQL Upsert for High Priority Translations
-- Generated from translations-needed-high-priority.csv
-- Updates localized names (fr, es, de, it, pt) for species in the database
-- Matches species by species_code

-- Albacore Tuna
UPDATE species
SET
  fr = 'Thon albacore',
  es = 'Bonito del norte'
WHERE species_code = 'ALB';

-- Almaco Jack (Kahala)
UPDATE species
SET
  fr = 'Sériole couronnée',
  es = 'Medregal'
WHERE species_code = '34cd60';

-- American Lobster
UPDATE species
SET
  fr = 'Homard américain',
  es = 'Langosta americana'
WHERE species_code = '42fd05';

-- Atlantic Halibut
UPDATE species
SET
  fr = 'Flétan de l''Atlantique',
  es = 'Fletán del Atlántico'
WHERE species_code = 'HAL';

-- Atlantic Herring
UPDATE species
SET
  fr = 'Hareng atlantique',
  es = 'Arenque atlántico'
WHERE species_code = 'HER';

-- Atlantic Menhaden
UPDATE species
SET
  fr = 'Menhaden atlantique',
  es = 'Menhaden atlántico'
WHERE species_code = 'MEN';

-- Atlantic Salmon
UPDATE species
SET
  fr = 'Saumon atlantique',
  es = 'Salmón atlántico'
WHERE species_code = 'ATS';

-- Atlantic Tarpon
UPDATE species
SET
  fr = 'Tarpon atlantique',
  es = 'Tarpón atlántico'
WHERE species_code = '654c4e';

-- Ballan Wrasse
UPDATE species
SET
  fr = 'Vieille',
  es = 'Maragota'
WHERE species_code = 'WRB';

-- Barred Pargo
UPDATE species
SET
  fr = 'Pargo barré',
  es = 'Pargo barrado'
WHERE species_code = '7dc45c';

-- Barred Surfperch
UPDATE species
SET
  fr = 'Embiotoca rayée',
  es = 'Mojarra rayada'
WHERE species_code = '445f50';

-- Barrelfish
UPDATE species
SET
  fr = 'Baril'
WHERE species_code = 'BARF';

-- Bigeye Tuna
UPDATE species
SET
  fr = 'Thon obèse',
  es = 'Atún patudo'
WHERE species_code = 'BET';

-- Black Drum
UPDATE species
SET
  fr = 'Tambour noir',
  es = 'Corvina negra'
WHERE species_code = '9d744d';

-- Black Durgon (Triggerfish)
UPDATE species
SET
  fr = 'Baliste noir',
  es = 'Pez ballesta negro'
WHERE species_code = '820d6c';

-- Black Grouper
UPDATE species
SET
  fr = 'Mérou noir',
  es = 'Mero negro'
WHERE species_code = '4b29c0';

-- Black Seabream
UPDATE species
SET
  fr = 'Dorade noire',
  es = 'Chopa'
WHERE species_code = 'BRS';

-- Blackbelly Rosefish
UPDATE species
SET
  fr = 'Sébaste à ventre noir',
  es = 'Gallineta'
WHERE species_code = 'BBR';

-- Blackfin Tuna
UPDATE species
SET
  fr = 'Thon à nageoires noires',
  es = 'Atún aleta negra'
WHERE species_code = 'fd782d';

-- Blacktip Shark
UPDATE species
SET
  fr = 'Requin bordé',
  es = 'Tiburón puntas negras'
WHERE species_code = '9a2958';

-- Blue Crab
UPDATE species
SET
  fr = 'Crabe bleu',
  es = 'Cangrejo azul'
WHERE species_code = '3c8dd6';

-- Blue Marlin
UPDATE species
SET
  fr = 'Marlin bleu',
  es = 'Marlín azul'
WHERE species_code = 'BUM';

-- Blue Shark
UPDATE species
SET
  fr = 'Requin peau bleue',
  es = 'Tintorera'
WHERE species_code = '9c1c48';

-- Bluefin Trevally (Omilu)
UPDATE species
SET
  fr = 'Carangue bleue',
  es = 'Jurel azul'
WHERE species_code = '8ce959';

-- Blueline Tilefish
UPDATE species
SET
  fr = 'Tile poisson-ligne'
WHERE species_code = 'BLT';

-- Bonefish
UPDATE species
SET
  fr = 'Banane',
  es = 'Macabí'
WHERE species_code = '9ef164';

-- Brill
UPDATE species
SET
  fr = 'Barbue',
  es = 'Remol'
WHERE species_code = 'BLL';

-- Bull Shark
UPDATE species
SET
  fr = 'Requin bouledogue',
  es = 'Tiburón toro'
WHERE species_code = 'ad05cc';

-- Cabezon
UPDATE species
SET
  fr = 'Chabot à tête large',
  es = 'Cabezón del Pacífico'
WHERE species_code = 'b1d960';

-- California Corbina
UPDATE species
SET
  fr = 'Corbina de Californie',
  es = 'Corbina californiana'
WHERE species_code = '639928';

-- California Sheephead
UPDATE species
SET
  fr = 'Labre de Californie',
  es = 'Vieja californiana'
WHERE species_code = '0162f6';

-- California Yellowtail
UPDATE species
SET
  fr = 'Sériole californienne',
  es = 'Pez limón (californiano)'
WHERE species_code = '4f1db2';

-- Cero Mackerel
UPDATE species
SET
  fr = 'Céro',
  es = 'Sierra cero'
WHERE species_code = 'ba1ee0';

-- Chum Salmon
UPDATE species
SET
  fr = 'Saumon kéta',
  es = 'Salmón keta'
WHERE species_code = 'CHM';

-- Cobia
UPDATE species
SET
  fr = 'Cobia',
  es = 'Cobia'
WHERE species_code = 'COB';

-- Coho Salmon
UPDATE species
SET
  fr = 'Saumon coho',
  es = 'Salmón coho'
WHERE species_code = 'CHO';

-- Common Cuttlefish
UPDATE species
SET
  fr = 'Seiche commune',
  es = 'Sepia común'
WHERE species_code = 'CUT';

-- Common Ling
UPDATE species
SET
  fr = 'Lingue',
  es = 'Maruca'
WHERE species_code = 'LIN';

-- Common Octopus
UPDATE species
SET
  fr = 'Poulpe commun',
  es = 'Pulpo común'
WHERE species_code = 'OCT';

-- Common Snook
UPDATE species
SET
  fr = 'Snook',
  es = 'Róbalo'
WHERE species_code = 'cda012';

-- Common Squid
UPDATE species
SET
  fr = 'Calmar commun',
  es = 'Calamar común'
WHERE species_code = 'SQC';

-- Common Thresher
UPDATE species
SET
  fr = 'Requin renard',
  es = 'Tiburón zorro'
WHERE species_code = '61158a';

-- Conger Eel
UPDATE species
SET
  fr = 'Congre',
  es = 'Congrio'
WHERE species_code = 'CON';

-- Cubera Snapper
UPDATE species
SET
  fr = 'Vivaneau cubera',
  es = 'Pargo cubera'
WHERE species_code = '18e76c';

-- Cuckoo Wrasse
UPDATE species
SET
  fr = 'Vieille coquette',
  es = 'Doncella'
WHERE species_code = 'WRC';

-- Dab
UPDATE species
SET
  fr = 'Limande',
  es = 'Limanda'
WHERE species_code = 'DAB';

-- Dentex
UPDATE species
SET
  fr = 'Denté',
  es = 'Dentón'
WHERE species_code = 'DEX';

-- Dover Sole
UPDATE species
SET
  fr = 'Sole commune',
  es = 'Lenguado común'
WHERE species_code = 'SOL';

-- Dungeness Crab
UPDATE species
SET
  fr = 'Crabe dormeur',
  es = 'Cangrejo de Dungeness'
WHERE species_code = 'c1aec4';

-- Florida Pompano
UPDATE species
SET
  fr = 'Carangue pompano',
  es = 'Pámpano de Florida'
WHERE species_code = 'dd85dd';

-- Flounder
UPDATE species
SET
  fr = 'Flet',
  es = 'Platija'
WHERE species_code = 'FLE';

-- Gag Grouper
UPDATE species
SET
  fr = 'Mérou gag',
  es = 'Mero gag'
WHERE species_code = '04bc28';

-- Garfish (Needlefish)
UPDATE species
SET
  fr = 'Orphie',
  es = 'Aguja'
WHERE species_code = 'GAR';

-- Giant Trevally (Ulua)
UPDATE species
SET
  fr = 'Carangue géante',
  es = 'Jurel gigante'
WHERE species_code = 'd2ba30';

-- Golden Tilefish
UPDATE species
SET
  fr = 'Tile doré',
  es = 'Blanquillo dorado'
WHERE species_code = 'GTF';

-- Goliath Grouper
UPDATE species
SET
  fr = 'Mérou géant',
  es = 'Mero Goliat'
WHERE species_code = 'd1a073';

-- Greater Amberjack
UPDATE species
SET
  fr = 'Sériole',
  es = 'Pez limón'
WHERE species_code = 'GAJ';

-- Greater Weever
UPDATE species
SET
  fr = 'Vive',
  es = 'Pez araña (común)'
WHERE species_code = 'WEE';

-- Gulf Grouper
UPDATE species
SET
  fr = 'Mérou du Golfe',
  es = 'Mero del Golfo'
WHERE species_code = 'a980bd';

-- Hogfish
UPDATE species
SET
  fr = 'Labre hogfish',
  es = 'Pez puerco'
WHERE species_code = 'd31d58';

-- Horse Mackerel
UPDATE species
SET
  fr = 'Chinchard',
  es = 'Jurel'
WHERE species_code = 'HOM';

-- Jack Crevalle
UPDATE species
SET
  fr = 'Carangue crevalle',
  es = 'Jurel crevalle'
WHERE species_code = 'dafb44';

-- John Dory
UPDATE species
SET
  fr = 'Saint-Pierre',
  es = 'San Pedro'
WHERE species_code = 'JOD';

-- Kelp Greenling
UPDATE species
SET
  fr = 'Greenling varech'
WHERE species_code = '8f5ec6';

-- King Mackerel
UPDATE species
SET
  fr = 'Thazard du roi',
  es = 'Sierra real'
WHERE species_code = '92f10a';

-- Leopard Grouper (Cabrilla)
UPDATE species
SET
  fr = 'Mérou léopard',
  es = 'Mero leopardo'
WHERE species_code = '99d717';

-- Lingcod
UPDATE species
SET
  fr = 'Lingcod'
WHERE species_code = 'd3be4a';

-- Little Tunny
UPDATE species
SET
  fr = 'Pélamide',
  es = 'Bacoreta'
WHERE species_code = 'LTA';

-- Longfin Inshore Squid
UPDATE species
SET
  fr = 'Calmar côtier longipes',
  es = 'Calamar costero de aleta larga'
WHERE species_code = '2071b4';

-- Mackerel
UPDATE species
SET
  fr = 'Maquereau',
  es = 'Caballa'
WHERE species_code = 'MAC';

-- Mangrove Snapper
UPDATE species
SET
  fr = 'Vivaneau gris',
  es = 'Pargo de manglar'
WHERE species_code = '17799e';

-- Manybar Goatfish
UPDATE species
SET
  fr = 'Rouget à bandes',
  es = 'Salmonete rayado'
WHERE species_code = '6093f7';

-- Market Squid
UPDATE species
SET
  fr = 'Calmar du marché',
  es = 'Calamar opalescente'
WHERE species_code = '0f173d';

-- Megrim
UPDATE species
SET
  fr = 'Cardine',
  es = 'Gallo'
WHERE species_code = 'LDB';

-- Mutton Snapper
UPDATE species
SET
  fr = 'Vivaneau mutton',
  es = 'Pargo criollo'
WHERE species_code = 'e0e710';

-- Nassau Grouper
UPDATE species
SET
  fr = 'Mérou Nassau',
  es = 'Mero Nassau'
WHERE species_code = '779f9b';

-- Pacific Bonito
UPDATE species
SET
  fr = 'Bonite du Pacifique',
  es = 'Bonito del Pacífico'
WHERE species_code = '5726f7';

-- Pacific Dog Snapper
UPDATE species
SET
  fr = 'Vivaneau chien',
  es = 'Pargo perro del Pacífico'
WHERE species_code = '720f4b';

-- Pacific Dover Sole
UPDATE species
SET
  fr = 'Sole du Pacifique',
  es = 'Lenguado del Pacífico'
WHERE species_code = 'DOV';

-- Pacific Herring
UPDATE species
SET
  fr = 'Hareng du Pacifique',
  es = 'Arenque del Pacífico'
WHERE species_code = 'HEP';

-- Pacific Sanddab
UPDATE species
SET
  fr = 'Sanddab',
  es = 'Lenguadina del Pacífico'
WHERE species_code = 'b4f26d';

-- Pacific Sierra Mackerel
UPDATE species
SET
  fr = 'Thazard sierra',
  es = 'Sierra del Pacífico'
WHERE species_code = '28a108';

-- Pacific White Seabass (Corvina)
UPDATE species
SET
  fr = 'Corvina blanche du Pacifique',
  es = 'Corvina blanca del Pacífico'
WHERE species_code = '7f6482';

-- Parrotfish
UPDATE species
SET
  fr = 'Perroquet',
  es = 'Pez loro'
WHERE species_code = 'PAR';

-- Permit
UPDATE species
SET
  fr = 'Permit',
  es = 'Palometa (permit)'
WHERE species_code = '3f8f97';

-- Petrale Sole
UPDATE species
SET
  fr = 'Sole petrale',
  es = 'Lenguado petrale'
WHERE species_code = 'PTR';

-- Pink Salmon
UPDATE species
SET
  fr = 'Saumon rose',
  es = 'Salmón rosado'
WHERE species_code = 'PNK';

-- Plaice
UPDATE species
SET
  fr = 'Plie',
  es = 'Solla'
WHERE species_code = 'PLE';

-- Pollack
UPDATE species
SET
  fr = 'Lieu jaune',
  es = 'Abadejo'
WHERE species_code = 'POL';

-- Queen Snapper
UPDATE species
SET
  fr = 'Vivaneau reine',
  es = 'Pargo reina'
WHERE species_code = 'QSN';

-- Red Drum (Redfish)
UPDATE species
SET
  fr = 'Red drum',
  es = 'Corvina roja (red drum)'
WHERE species_code = '2a5836';

-- Red Grouper
UPDATE species
SET
  fr = 'Mérou rouge',
  es = 'Mero rojo'
WHERE species_code = 'c413e5';

-- Red Mullet
UPDATE species
SET
  fr = 'Rouget grondin',
  es = 'Salmonete de roca'
WHERE species_code = 'MUL';

-- Red Seabream
UPDATE species
SET
  fr = 'Pagre commun',
  es = 'Besugo'
WHERE species_code = 'SBR';

-- Redtail Surfperch
UPDATE species
SET
  fr = 'Surfperche à queue rouge',
  es = 'Mojarra cola roja'
WHERE species_code = '5bec07';

-- Sailfish
UPDATE species
SET
  fr = 'Voilier',
  es = 'Pez vela'
WHERE species_code = 'SAI';

-- Sand Eel
UPDATE species
SET
  fr = 'Lancon',
  es = 'Lanzón'
WHERE species_code = 'SAN';

-- Sardine
UPDATE species
SET
  fr = 'Sardine',
  es = 'Sardina'
WHERE species_code = 'PIL';

-- Scalloped Hammerhead
UPDATE species
SET
  fr = 'Requin marteau halicorne',
  es = 'Cornuda común'
WHERE species_code = '3dd951';

-- Scamp Grouper
UPDATE species
SET
  fr = 'Mérou scamp',
  es = 'Mero scamp'
WHERE species_code = 'b39b90';

-- Sea Bass
UPDATE species
SET
  fr = 'Bar européen',
  es = 'Lubina'
WHERE species_code = 'BSS';

-- Sea Bream (Dorada)
UPDATE species
SET
  fr = 'Dorade royale',
  es = 'Dorada'
WHERE species_code = 'SBA';

-- Sea Trout
UPDATE species
SET
  fr = 'Truite de mer',
  es = 'Trucha marina'
WHERE species_code = 'TRS';

-- Sheepshead
UPDATE species
SET
  fr = 'Sheepshead',
  es = 'Sargo chopa'
WHERE species_code = '0a52d4';

-- Shortfin Mako
UPDATE species
SET
  fr = 'Requin mako',
  es = 'Marrajo dientuso'
WHERE species_code = 'SMA';

-- Silver Hake (Atlantic Whiting)
UPDATE species
SET
  fr = 'Merlu argenté',
  es = 'Merluza plateada'
WHERE species_code = 'e306b9';

-- Skipjack Tuna
UPDATE species
SET
  fr = 'Bonite skipjack',
  es = 'Listao'
WHERE species_code = 'SKJ';

-- Small-spotted Catshark
UPDATE species
SET
  fr = 'Petite roussette',
  es = 'Pintarroja'
WHERE species_code = 'SCY';

-- Snowy Grouper
UPDATE species
SET
  fr = 'Mérou snowy',
  es = 'Mero nevado'
WHERE species_code = 'SNG';

-- Sockeye Salmon
UPDATE species
SET
  fr = 'Saumon rouge',
  es = 'Salmón rojo (sockeye)'
WHERE species_code = 'SOK';

-- Spanish Mackerel
UPDATE species
SET
  fr = 'Thazard espagnol',
  es = 'Sierra española'
WHERE species_code = '469e2c';

-- Spotted Bass
UPDATE species
SET
  fr = 'Bar ponctué',
  es = 'Lubina pintada'
WHERE species_code = 'BSP';

-- Spotted Seatrout (Speckled Trout)
UPDATE species
SET
  fr = 'Truite tachetée',
  es = 'Trucha moteada'
WHERE species_code = 'bdf304';

-- Sprat
UPDATE species
SET
  fr = 'Sprat',
  es = 'Espadín'
WHERE species_code = 'SPR';

-- Steelhead (Sea-run Rainbow Trout)
UPDATE species
SET
  fr = 'Truite arc-en-ciel migratrice',
  es = 'Trucha arcoíris (steelhead)'
WHERE species_code = '904d43';

-- Stone Crab
UPDATE species
SET
  fr = 'Crabe de roche',
  es = 'Cangrejo de piedra'
WHERE species_code = 'c99402';

-- Striped Marlin
UPDATE species
SET
  fr = 'Marlin rayé',
  es = 'Marlín rayado'
WHERE species_code = 'MLS';

-- Summer Flounder (Fluke)
UPDATE species
SET
  fr = 'Flet estival',
  es = 'Platija de verano'
WHERE species_code = 'FLK';

-- Thornback Ray
UPDATE species
SET
  fr = 'Raie bouclée',
  es = 'Raya de clavos'
WHERE species_code = 'RJC';

-- Tiger Shark
UPDATE species
SET
  fr = 'Requin tigre',
  es = 'Tiburón tigre'
WHERE species_code = 'a3c183';

-- Tripletail
UPDATE species
SET
  fr = 'Poisson triple-queue',
  es = 'Pez tres colas'
WHERE species_code = 'c4557a';

-- Tub Gurnard
UPDATE species
SET
  fr = 'Grondin perlon',
  es = 'Rubio'
WHERE species_code = 'GUG';

-- Turbot (Small)
UPDATE species
SET
  fr = 'Turbot',
  es = 'Rodaballo'
WHERE species_code = 'TUR';

-- Uku (Green Jobfish)
UPDATE species
SET
  fr = 'Poisson-uku',
  es = 'Jobfish verde (uku)'
WHERE species_code = 'b5a9c2';

-- Vermilion Snapper
UPDATE species
SET
  fr = 'Vivaneau vermillon',
  es = 'Pargo bermellón'
WHERE species_code = '36dcaa';

-- Wahoo
UPDATE species
SET
  fr = 'Thazard wahoo',
  es = 'Peto'
WHERE species_code = 'WAH';

-- Warsaw Grouper
UPDATE species
SET
  fr = 'Mérou Warsaw',
  es = 'Mero Warsaw'
WHERE species_code = 'WSG';

-- Wenchman
UPDATE species
SET
  fr = 'Vivaneau wenchman'
WHERE species_code = 'WEN';

-- White Marlin
UPDATE species
SET
  fr = 'Marlin blanc',
  es = 'Marlín blanco'
WHERE species_code = 'f5fc63';

-- Whiting
UPDATE species
SET
  fr = 'Merlan',
  es = 'Bacaladilla'
WHERE species_code = 'WHG';

-- Winter Flounder
UPDATE species
SET
  fr = 'Flet d''hiver',
  es = 'Platija de invierno'
WHERE species_code = 'e4725f';

-- Wrasse (various)
UPDATE species
SET
  fr = 'Labres',
  es = 'Lábridos'
WHERE species_code = 'WRA';

-- Wreckfish
UPDATE species
SET
  fr = 'Cernier',
  es = 'Cherna'
WHERE species_code = 'WRK2';

-- Yellowedge Grouper
UPDATE species
SET
  fr = 'Mérou yellowedge',
  es = 'Mero de borde amarillo'
WHERE species_code = 'YEG';

-- Yellowtail Snapper
UPDATE species
SET
  fr = 'Vivaneau queue-jaune',
  es = 'Rabirrubia'
WHERE species_code = '91f278';


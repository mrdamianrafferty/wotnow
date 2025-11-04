-- SQL Upsert for High Priority Translations
-- Generated from translations-needed-high-priority.csv
-- Updates localized names (fr, es, de, it, pt) for species in the database
-- Matches species by species_code

-- Albacore Tuna
UPDATE species
SET
  name_fr = 'Thon albacore',
  name_es = 'Bonito del norte',
  name_pt = 'Atum albacora (Albacora-branca)'
WHERE species_code = 'ALB';

-- Almaco Jack (Kahala)
UPDATE species
SET
  name_fr = 'Sériole couronnée',
  name_es = 'Medregal',
  name_pt = 'Lírio-cavala (Olho-de-boi)'
WHERE species_code = '34cd60';

-- American Lobster
UPDATE species
SET
  name_fr = 'Homard américain',
  name_es = 'Langosta americana',
  name_pt = 'Lagosta-americana'
WHERE species_code = '42fd05';

-- Atlantic Halibut
UPDATE species
SET
  name_fr = 'Flétan de l''Atlantique',
  name_es = 'Fletán del Atlántico',
  name_pt = 'Halibute-do-Atlântico'
WHERE species_code = 'HAL';

-- Atlantic Herring
UPDATE species
SET
  name_fr = 'Hareng atlantique',
  name_es = 'Arenque atlántico',
  name_pt = 'Arenque-atlântico'
WHERE species_code = 'HER';

-- Atlantic Menhaden
UPDATE species
SET
  name_fr = 'Menhaden atlantique',
  name_es = 'Menhaden atlántico',
  name_pt = 'Menhaden-atlântico'
WHERE species_code = 'MEN';

-- Atlantic Salmon
UPDATE species
SET
  name_fr = 'Saumon atlantique',
  name_es = 'Salmón atlántico',
  name_pt = 'Salmão-atlântico'
WHERE species_code = 'ATS';

-- Atlantic Tarpon
UPDATE species
SET
  name_fr = 'Tarpon atlantique',
  name_es = 'Tarpón atlántico',
  name_pt = 'Tarpon-atlântico (Tarpão)'
WHERE species_code = '654c4e';

-- Ballan Wrasse
UPDATE species
SET
  name_fr = 'Vieille',
  name_es = 'Maragota',
  name_pt = 'Bodião-maragota'
WHERE species_code = 'WRB';

-- Barred Pargo
UPDATE species
SET
  name_fr = 'Pargo barré',
  name_es = 'Pargo barrado',
  name_pt = 'Pargo-barrado'
WHERE species_code = '7dc45c';

-- Barred Surfperch
UPDATE species
SET
  name_fr = 'Embiotoca rayée',
  name_es = 'Mojarra rayada',
  name_pt = 'Moarra-riscada'
WHERE species_code = '445f50';

-- Barrelfish
UPDATE species
SET
  name_fr = 'Baril'
WHERE species_code = 'BARF';

-- Bigeye Tuna
UPDATE species
SET
  name_fr = 'Thon obèse',
  name_es = 'Atún patudo',
  name_pt = 'Atum patudo'
WHERE species_code = 'BET';

-- Black Drum
UPDATE species
SET
  name_fr = 'Tambour noir',
  name_es = 'Corvina negra',
  name_pt = 'Corvina-negra'
WHERE species_code = '9d744d';

-- Black Durgon (Triggerfish)
UPDATE species
SET
  name_fr = 'Baliste noir',
  name_es = 'Pez ballesta negro',
  name_pt = 'Peixe-porco-negro'
WHERE species_code = '820d6c';

-- Black Grouper
UPDATE species
SET
  name_fr = 'Mérou noir',
  name_es = 'Mero negro',
  name_pt = 'Garoupa-negra (Mero-negro)'
WHERE species_code = '4b29c0';

-- Black Seabream
UPDATE species
SET
  name_fr = 'Dorade noire',
  name_es = 'Chopa',
  name_pt = 'Sargo-negro'
WHERE species_code = 'BRS';

-- Blackbelly Rosefish
UPDATE species
SET
  name_fr = 'Sébaste à ventre noir',
  name_es = 'Gallineta',
  name_pt = 'Rascasso-de-barriga-preta'
WHERE species_code = 'BBR';

-- Blackfin Tuna
UPDATE species
SET
  name_fr = 'Thon à nageoires noires',
  name_es = 'Atún aleta negra',
  name_pt = 'Atum aleta-preta'
WHERE species_code = 'fd782d';

-- Blacktip Shark
UPDATE species
SET
  name_fr = 'Requin bordé',
  name_es = 'Tiburón puntas negras',
  name_pt = 'Tubarão-ponta-preta'
WHERE species_code = '9a2958';

-- Blue Crab
UPDATE species
SET
  name_fr = 'Crabe bleu',
  name_es = 'Cangrejo azul',
  name_pt = 'Caranguejo-azul'
WHERE species_code = '3c8dd6';

-- Blue Marlin
UPDATE species
SET
  name_fr = 'Marlin bleu',
  name_es = 'Marlín azul',
  name_pt = 'Marlim-azul'
WHERE species_code = 'BUM';

-- Blue Shark
UPDATE species
SET
  name_fr = 'Requin peau bleue',
  name_es = 'Tintorera',
  name_pt = 'Tintureira'
WHERE species_code = '9c1c48';

-- Bluefin Trevally (Omilu)
UPDATE species
SET
  name_fr = 'Carangue bleue',
  name_es = 'Jurel azul',
  name_pt = 'Xaréu-azul (Xaréu-azul-BR)'
WHERE species_code = '8ce959';

-- Blueline Tilefish
UPDATE species
SET
  name_fr = 'Tile poisson-ligne'
WHERE species_code = 'BLT';

-- Bonefish
UPDATE species
SET
  name_fr = 'Banane',
  name_es = 'Macabí',
  name_pt = 'Ubarana (Ubarana-branca)'
WHERE species_code = '9ef164';

-- Brill
UPDATE species
SET
  name_fr = 'Barbue',
  name_es = 'Remol',
  name_pt = 'Solha-branca'
WHERE species_code = 'BLL';

-- Bull Shark
UPDATE species
SET
  name_fr = 'Requin bouledogue',
  name_es = 'Tiburón toro',
  name_pt = 'Tubarão-touro'
WHERE species_code = 'ad05cc';

-- Cabezon
UPDATE species
SET
  name_fr = 'Chabot à tête large',
  name_es = 'Cabezón del Pacífico',
  name_pt = 'Cabeçudo-do-Pacífico'
WHERE species_code = 'b1d960';

-- California Corbina
UPDATE species
SET
  name_fr = 'Corbina de Californie',
  name_es = 'Corbina californiana',
  name_pt = 'Corvina-californiana'
WHERE species_code = '639928';

-- California Sheephead
UPDATE species
SET
  name_fr = 'Labre de Californie',
  name_es = 'Vieja californiana',
  name_pt = 'Peixe-carpinteiro-californiano'
WHERE species_code = '0162f6';

-- California Yellowtail
UPDATE species
SET
  name_fr = 'Sériole californienne',
  name_es = 'Pez limón (californiano)',
  name_pt = 'Enxova-do-Pacífico (Sororoca-amarela)'
WHERE species_code = '4f1db2';

-- Cero Mackerel
UPDATE species
SET
  name_fr = 'Céro',
  name_es = 'Sierra cero',
  name_pt = 'Sierra-cero'
WHERE species_code = 'ba1ee0';

-- Chum Salmon
UPDATE species
SET
  name_fr = 'Saumon kéta',
  name_es = 'Salmón keta',
  name_pt = 'Salmão-keta'
WHERE species_code = 'CHM';

-- Cobia
UPDATE species
SET
  name_fr = 'Cobia',
  name_es = 'Cobia',
  name_pt = 'Beijupirá'
WHERE species_code = 'COB';

-- Coho Salmon
UPDATE species
SET
  name_fr = 'Saumon coho',
  name_es = 'Salmón coho',
  name_pt = 'Salmão-coho'
WHERE species_code = 'CHO';

-- Common Cuttlefish
UPDATE species
SET
  name_fr = 'Seiche commune',
  name_es = 'Sepia común',
  name_pt = 'Choco-comum'
WHERE species_code = 'CUT';

-- Common Ling
UPDATE species
SET
  name_fr = 'Lingue',
  name_es = 'Maruca',
  name_pt = 'Lingue'
WHERE species_code = 'LIN';

-- Common Octopus
UPDATE species
SET
  name_fr = 'Poulpe commun',
  name_es = 'Pulpo común',
  name_pt = 'Polvo-comum'
WHERE species_code = 'OCT';

-- Common Snook
UPDATE species
SET
  name_fr = 'Snook',
  name_es = 'Róbalo',
  name_pt = 'Robalo-flecha'
WHERE species_code = 'cda012';

-- Common Squid
UPDATE species
SET
  name_fr = 'Calmar commun',
  name_es = 'Calamar común',
  name_pt = 'Lula-comum'
WHERE species_code = 'SQC';

-- Common Thresher
UPDATE species
SET
  name_fr = 'Requin renard',
  name_es = 'Tiburón zorro',
  name_pt = 'Tubarão-raposa'
WHERE species_code = '61158a';

-- Conger Eel
UPDATE species
SET
  name_fr = 'Congre',
  name_es = 'Congrio',
  name_pt = 'Safio'
WHERE species_code = 'CON';

-- Cubera Snapper
UPDATE species
SET
  name_fr = 'Vivaneau cubera',
  name_es = 'Pargo cubera',
  name_pt = 'Pargo-cubera'
WHERE species_code = '18e76c';

-- Cuckoo Wrasse
UPDATE species
SET
  name_fr = 'Vieille coquette',
  name_es = 'Doncella',
  name_pt = 'Bodião-donzela'
WHERE species_code = 'WRC';

-- Dab
UPDATE species
SET
  name_fr = 'Limande',
  name_es = 'Limanda',
  name_pt = 'Solha'
WHERE species_code = 'DAB';

-- Dentex
UPDATE species
SET
  name_fr = 'Denté',
  name_es = 'Dentón',
  name_pt = 'Dentão'
WHERE species_code = 'DEX';

-- Dover Sole
UPDATE species
SET
  name_fr = 'Sole commune',
  name_es = 'Lenguado común',
  name_pt = 'Linguado-comum'
WHERE species_code = 'SOL';

-- Dungeness Crab
UPDATE species
SET
  name_fr = 'Crabe dormeur',
  name_es = 'Cangrejo de Dungeness',
  name_pt = 'Caranguejo-Dungeness'
WHERE species_code = 'c1aec4';

-- Florida Pompano
UPDATE species
SET
  name_fr = 'Carangue pompano',
  name_es = 'Pámpano de Florida',
  name_pt = 'Pampo-da-Flórida'
WHERE species_code = 'dd85dd';

-- Flounder
UPDATE species
SET
  name_fr = 'Flet',
  name_es = 'Platija',
  name_pt = 'Solha (Linguado-do-norte)'
WHERE species_code = 'FLE';

-- Gag Grouper
UPDATE species
SET
  name_fr = 'Mérou gag',
  name_es = 'Mero gag',
  name_pt = 'Garoupa-gag'
WHERE species_code = '04bc28';

-- Garfish (Needlefish)
UPDATE species
SET
  name_fr = 'Orphie',
  name_es = 'Aguja',
  name_pt = 'Agulhão'
WHERE species_code = 'GAR';

-- Giant Trevally (Ulua)
UPDATE species
SET
  name_fr = 'Carangue géante',
  name_es = 'Jurel gigante',
  name_pt = 'Xaréu-gigante'
WHERE species_code = 'd2ba30';

-- Golden Tilefish
UPDATE species
SET
  name_fr = 'Tile doré',
  name_es = 'Blanquillo dorado',
  name_pt = 'Peixe-azulejo-dourado'
WHERE species_code = 'GTF';

-- Goliath Grouper
UPDATE species
SET
  name_fr = 'Mérou géant',
  name_es = 'Mero Goliat',
  name_pt = 'Mero-gigante'
WHERE species_code = 'd1a073';

-- Greater Amberjack
UPDATE species
SET
  name_fr = 'Sériole',
  name_es = 'Pez limón',
  name_pt = 'Lírio (Olho-de-boi)'
WHERE species_code = 'GAJ';

-- Greater Weever
UPDATE species
SET
  name_fr = 'Vive',
  name_es = 'Pez araña (común)',
  name_pt = 'Peixe-arraia'
WHERE species_code = 'WEE';

-- Gulf Grouper
UPDATE species
SET
  name_fr = 'Mérou du Golfe',
  name_es = 'Mero del Golfo',
  name_pt = 'Garoupa-do-Golfo'
WHERE species_code = 'a980bd';

-- Hogfish
UPDATE species
SET
  name_fr = 'Labre hogfish',
  name_es = 'Pez puerco',
  name_pt = 'Peixe-porco'
WHERE species_code = 'd31d58';

-- Horse Mackerel
UPDATE species
SET
  name_fr = 'Chinchard',
  name_es = 'Jurel',
  name_pt = 'Carapau'
WHERE species_code = 'HOM';

-- Jack Crevalle
UPDATE species
SET
  name_fr = 'Carangue crevalle',
  name_es = 'Jurel crevalle',
  name_pt = 'Xaréu-branco'
WHERE species_code = 'dafb44';

-- John Dory
UPDATE species
SET
  name_fr = 'Saint-Pierre',
  name_es = 'San Pedro',
  name_pt = 'Peixe-galo'
WHERE species_code = 'JOD';

-- Kelp Greenling
UPDATE species
SET
  name_fr = 'Greenling varech'
WHERE species_code = '8f5ec6';

-- King Mackerel
UPDATE species
SET
  name_fr = 'Thazard du roi',
  name_es = 'Sierra real',
  name_pt = 'Cavala-real (Sororoca-real)'
WHERE species_code = '92f10a';

-- Leopard Grouper (Cabrilla)
UPDATE species
SET
  name_fr = 'Mérou léopard',
  name_es = 'Mero leopardo',
  name_pt = 'Garoupa-leopardo'
WHERE species_code = '99d717';

-- Lingcod
UPDATE species
SET
  name_fr = 'Lingcod'
WHERE species_code = 'd3be4a';

-- Little Tunny
UPDATE species
SET
  name_fr = 'Pélamide',
  name_es = 'Bacoreta',
  name_pt = 'Serra-falsa (Bonito-cinzento)'
WHERE species_code = 'LTA';

-- Longfin Inshore Squid
UPDATE species
SET
  name_fr = 'Calmar côtier longipes',
  name_es = 'Calamar costero de aleta larga',
  name_pt = 'Lula-costeira-de-barbatanas-longas'
WHERE species_code = '2071b4';

-- Mackerel
UPDATE species
SET
  name_fr = 'Maquereau',
  name_es = 'Caballa',
  name_pt = 'Cavala'
WHERE species_code = 'MAC';

-- Mangrove Snapper
UPDATE species
SET
  name_fr = 'Vivaneau gris',
  name_es = 'Pargo de manglar',
  name_pt = 'Pargo-de-mangue'
WHERE species_code = '17799e';

-- Manybar Goatfish
UPDATE species
SET
  name_fr = 'Rouget à bandes',
  name_es = 'Salmonete rayado',
  name_pt = 'Peixe-cabra-listrado'
WHERE species_code = '6093f7';

-- Market Squid
UPDATE species
SET
  name_fr = 'Calmar du marché',
  name_es = 'Calamar opalescente',
  name_pt = 'Lula-opalescente'
WHERE species_code = '0f173d';

-- Megrim
UPDATE species
SET
  name_fr = 'Cardine',
  name_es = 'Gallo',
  name_pt = 'Geco'
WHERE species_code = 'LDB';

-- Mutton Snapper
UPDATE species
SET
  name_fr = 'Vivaneau mutton',
  name_es = 'Pargo criollo',
  name_pt = 'Pargo-cabrito'
WHERE species_code = 'e0e710';

-- Nassau Grouper
UPDATE species
SET
  name_fr = 'Mérou Nassau',
  name_es = 'Mero Nassau',
  name_pt = 'Garoupa-Nassau'
WHERE species_code = '779f9b';

-- Pacific Bonito
UPDATE species
SET
  name_fr = 'Bonite du Pacifique',
  name_es = 'Bonito del Pacífico',
  name_pt = 'Bonito-do-Pacífico'
WHERE species_code = '5726f7';

-- Pacific Dog Snapper
UPDATE species
SET
  name_fr = 'Vivaneau chien',
  name_es = 'Pargo perro del Pacífico',
  name_pt = 'Pargo-cão'
WHERE species_code = '720f4b';

-- Pacific Dover Sole
UPDATE species
SET
  name_fr = 'Sole du Pacifique',
  name_es = 'Lenguado del Pacífico',
  name_pt = 'Linguado-do-Pacífico'
WHERE species_code = 'DOV';

-- Pacific Herring
UPDATE species
SET
  name_fr = 'Hareng du Pacifique',
  name_es = 'Arenque del Pacífico',
  name_pt = 'Arenque-do-Pacífico'
WHERE species_code = 'HEP';

-- Pacific Sanddab
UPDATE species
SET
  name_fr = 'Sanddab',
  name_es = 'Lenguadina del Pacífico',
  name_pt = 'Solha-do-Pacífico'
WHERE species_code = 'b4f26d';

-- Pacific Sierra Mackerel
UPDATE species
SET
  name_fr = 'Thazard sierra',
  name_es = 'Sierra del Pacífico',
  name_pt = 'Cavala-sierra'
WHERE species_code = '28a108';

-- Pacific White Seabass (Corvina)
UPDATE species
SET
  name_fr = 'Corvina blanche du Pacifique',
  name_es = 'Corvina blanca del Pacífico',
  name_pt = 'Corvina-branca-do-Pacífico'
WHERE species_code = '7f6482';

-- Parrotfish
UPDATE species
SET
  name_fr = 'Perroquet',
  name_es = 'Pez loro',
  name_pt = 'Peixe-papagaio'
WHERE species_code = 'PAR';

-- Permit
UPDATE species
SET
  name_fr = 'Permit',
  name_es = 'Palometa (permit)',
  name_pt = 'Pampo-permit'
WHERE species_code = '3f8f97';

-- Petrale Sole
UPDATE species
SET
  name_fr = 'Sole petrale',
  name_es = 'Lenguado petrale',
  name_pt = 'Linguado-petrale'
WHERE species_code = 'PTR';

-- Pink Salmon
UPDATE species
SET
  name_fr = 'Saumon rose',
  name_es = 'Salmón rosado',
  name_pt = 'Salmão-rosa'
WHERE species_code = 'PNK';

-- Plaice
UPDATE species
SET
  name_fr = 'Plie',
  name_es = 'Solla',
  name_pt = 'Solha-europeia'
WHERE species_code = 'PLE';

-- Pollack
UPDATE species
SET
  name_fr = 'Lieu jaune',
  name_es = 'Abadejo',
  name_pt = 'Palmeta'
WHERE species_code = 'POL';

-- Queen Snapper
UPDATE species
SET
  name_fr = 'Vivaneau reine',
  name_es = 'Pargo reina',
  name_pt = 'Pargo-rainha'
WHERE species_code = 'QSN';

-- Red Drum (Redfish)
UPDATE species
SET
  name_fr = 'Red drum',
  name_es = 'Corvina roja (red drum)',
  name_pt = 'Tamboril-vermelho (Red drum)'
WHERE species_code = '2a5836';

-- Red Grouper
UPDATE species
SET
  name_fr = 'Mérou rouge',
  name_es = 'Mero rojo',
  name_pt = 'Garoupa-vermelha'
WHERE species_code = 'c413e5';

-- Red Mullet
UPDATE species
SET
  name_fr = 'Rouget grondin',
  name_es = 'Salmonete de roca',
  name_pt = 'Salmonete-vermelho'
WHERE species_code = 'MUL';

-- Red Seabream
UPDATE species
SET
  name_fr = 'Pagre commun',
  name_es = 'Besugo',
  name_pt = 'Pargo-comum'
WHERE species_code = 'SBR';

-- Redtail Surfperch
UPDATE species
SET
  name_fr = 'Surfperche à queue rouge',
  name_es = 'Mojarra cola roja',
  name_pt = 'Moarra-cauda-vermelha'
WHERE species_code = '5bec07';

-- Sailfish
UPDATE species
SET
  name_fr = 'Voilier',
  name_es = 'Pez vela',
  name_pt = 'Agulhão-vela'
WHERE species_code = 'SAI';

-- Sand Eel
UPDATE species
SET
  name_fr = 'Lancon',
  name_es = 'Lanzón',
  name_pt = 'Tafaneco'
WHERE species_code = 'SAN';

-- Sardine
UPDATE species
SET
  name_fr = 'Sardine',
  name_es = 'Sardina',
  name_pt = 'Sardinha'
WHERE species_code = 'PIL';

-- Scalloped Hammerhead
UPDATE species
SET
  name_fr = 'Requin marteau halicorne',
  name_es = 'Cornuda común',
  name_pt = 'Tubarão-martelo-curvo'
WHERE species_code = '3dd951';

-- Scamp Grouper
UPDATE species
SET
  name_fr = 'Mérou scamp',
  name_es = 'Mero scamp',
  name_pt = 'Garoupa-scamp'
WHERE species_code = 'b39b90';

-- Sea Bass
UPDATE species
SET
  name_fr = 'Bar européen',
  name_es = 'Lubina',
  name_pt = 'Robalo-europeu'
WHERE species_code = 'BSS';

-- Sea Bream (Dorada)
UPDATE species
SET
  name_fr = 'Dorade royale',
  name_es = 'Dorada',
  name_pt = 'Dourada'
WHERE species_code = 'SBA';

-- Sea Trout
UPDATE species
SET
  name_fr = 'Truite de mer',
  name_es = 'Trucha marina',
  name_pt = 'Truta-marinha'
WHERE species_code = 'TRS';

-- Sheepshead
UPDATE species
SET
  name_fr = 'Sheepshead',
  name_es = 'Sargo chopa',
  name_pt = 'Sargo-ovelha'
WHERE species_code = '0a52d4';

-- Shortfin Mako
UPDATE species
SET
  name_fr = 'Requin mako',
  name_es = 'Marrajo dientuso',
  name_pt = 'Tubarão-mako'
WHERE species_code = 'SMA';

-- Silver Hake (Atlantic Whiting)
UPDATE species
SET
  name_fr = 'Merlu argenté',
  name_es = 'Merluza plateada',
  name_pt = 'Pescada-prateada'
WHERE species_code = 'e306b9';

-- Skipjack Tuna
UPDATE species
SET
  name_fr = 'Bonite skipjack',
  name_es = 'Listao',
  name_pt = 'Atum-listado'
WHERE species_code = 'SKJ';

-- Small-spotted Catshark
UPDATE species
SET
  name_fr = 'Petite roussette',
  name_es = 'Pintarroja',
  name_pt = 'Pintarroxa'
WHERE species_code = 'SCY';

-- Snowy Grouper
UPDATE species
SET
  name_fr = 'Mérou snowy',
  name_es = 'Mero nevado',
  name_pt = 'Garoupa-nevada'
WHERE species_code = 'SNG';

-- Sockeye Salmon
UPDATE species
SET
  name_fr = 'Saumon rouge',
  name_es = 'Salmón rojo (sockeye)',
  name_pt = 'Salmão-vermelho'
WHERE species_code = 'SOK';

-- Spanish Mackerel
UPDATE species
SET
  name_fr = 'Thazard espagnol',
  name_es = 'Sierra española',
  name_pt = 'Cavala-espanhola'
WHERE species_code = '469e2c';

-- Spotted Bass
UPDATE species
SET
  name_fr = 'Bar ponctué',
  name_es = 'Lubina pintada',
  name_pt = 'Robalo-pintado'
WHERE species_code = 'BSP';

-- Spotted Seatrout (Speckled Trout)
UPDATE species
SET
  name_fr = 'Truite tachetée',
  name_es = 'Trucha moteada',
  name_pt = 'Truta-moteada'
WHERE species_code = 'bdf304';

-- Sprat
UPDATE species
SET
  name_fr = 'Sprat',
  name_es = 'Espadín',
  name_pt = 'Esparrela'
WHERE species_code = 'SPR';

-- Steelhead (Sea-run Rainbow Trout)
UPDATE species
SET
  name_fr = 'Truite arc-en-ciel migratrice',
  name_es = 'Trucha arcoíris (steelhead)',
  name_pt = 'Truta-arco-íris-anádroma'
WHERE species_code = '904d43';

-- Stone Crab
UPDATE species
SET
  name_fr = 'Crabe de roche',
  name_es = 'Cangrejo de piedra',
  name_pt = 'Caranguejo-pedra'
WHERE species_code = 'c99402';

-- Striped Marlin
UPDATE species
SET
  name_fr = 'Marlin rayé',
  name_es = 'Marlín rayado',
  name_pt = 'Marlim-listrado'
WHERE species_code = 'MLS';

-- Summer Flounder (Fluke)
UPDATE species
SET
  name_fr = 'Flet estival',
  name_es = 'Platija de verano',
  name_pt = 'Solha-de-verão'
WHERE species_code = 'FLK';

-- Thornback Ray
UPDATE species
SET
  name_fr = 'Raie bouclée',
  name_es = 'Raya de clavos',
  name_pt = 'Raia-de-espinhos'
WHERE species_code = 'RJC';

-- Tiger Shark
UPDATE species
SET
  name_fr = 'Requin tigre',
  name_es = 'Tiburón tigre',
  name_pt = 'Tubarão-tigre'
WHERE species_code = 'a3c183';

-- Tripletail
UPDATE species
SET
  name_fr = 'Poisson triple-queue',
  name_es = 'Pez tres colas',
  name_pt = 'Peixe-três-caudas'
WHERE species_code = 'c4557a';

-- Tub Gurnard
UPDATE species
SET
  name_fr = 'Grondin perlon',
  name_es = 'Rubio',
  name_pt = 'Beijoto'
WHERE species_code = 'GUG';

-- Turbot (Small)
UPDATE species
SET
  name_fr = 'Turbot',
  name_es = 'Rodaballo',
  name_pt = 'Rodovalho'
WHERE species_code = 'TUR';

-- Uku (Green Jobfish)
UPDATE species
SET
  name_fr = 'Poisson-uku',
  name_es = 'Jobfish verde (uku)',
  name_pt = 'Peixe-uku'
WHERE species_code = 'b5a9c2';

-- Vermilion Snapper
UPDATE species
SET
  name_fr = 'Vivaneau vermillon',
  name_es = 'Pargo bermellón',
  name_pt = 'Pargo-vermelhão'
WHERE species_code = '36dcaa';

-- Wahoo
UPDATE species
SET
  name_fr = 'Thazard wahoo',
  name_es = 'Peto',
  name_pt = 'Aipim-do-mar'
WHERE species_code = 'WAH';

-- Warsaw Grouper
UPDATE species
SET
  name_fr = 'Mérou Warsaw',
  name_es = 'Mero Warsaw',
  name_pt = 'Garoupa-Warsaw'
WHERE species_code = 'WSG';

-- Wenchman
UPDATE species
SET
  name_fr = 'Vivaneau wenchman'
WHERE species_code = 'WEN';

-- White Marlin
UPDATE species
SET
  name_fr = 'Marlin blanc',
  name_es = 'Marlín blanco',
  name_pt = 'Marlim-branco'
WHERE species_code = 'f5fc63';

-- Whiting
UPDATE species
SET
  name_fr = 'Merlan',
  name_es = 'Bacaladilla',
  name_pt = 'Pescadinha'
WHERE species_code = 'WHG';

-- Winter Flounder
UPDATE species
SET
  name_fr = 'Flet d''hiver',
  name_es = 'Platija de invierno',
  name_pt = 'Solha-de-inverno'
WHERE species_code = 'e4725f';

-- Wrasse (various)
UPDATE species
SET
  name_fr = 'Labres',
  name_es = 'Lábridos',
  name_pt = 'Bodiões'
WHERE species_code = 'WRA';

-- Wreckfish
UPDATE species
SET
  name_fr = 'Cernier',
  name_es = 'Cherna',
  name_pt = 'Cherne'
WHERE species_code = 'WRK2';

-- Yellowedge Grouper
UPDATE species
SET
  name_fr = 'Mérou yellowedge',
  name_es = 'Mero de borde amarillo',
  name_pt = 'Garoupa-borda-amarela'
WHERE species_code = 'YEG';

-- Yellowtail Snapper
UPDATE species
SET
  name_fr = 'Vivaneau queue-jaune',
  name_es = 'Rabirrubia',
  name_pt = 'Pargo-rabeta-amarela (Rabirrubro-BR)'
WHERE species_code = '91f278';


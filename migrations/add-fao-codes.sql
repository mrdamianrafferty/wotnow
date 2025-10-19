-- Upsert FAO 3-alpha codes into public.species
-- Generated automatically from species_with_fao_unique_fixed.csv

BEGIN;

ALTER TABLE public.species
  ADD COLUMN IF NOT EXISTS fao_3alpha_code_unique text;

WITH data(id, code) AS (
    VALUES
        ('042f8eee-b819-4cdc-a913-508c41b4c7bb'::uuid, 'SPC'),
        ('09c25d59-0180-41fa-a1e0-216a3acb8be4'::uuid, 'YFM'),
        ('0bf0af5d-191b-45af-85c5-8052e39a8b37'::uuid, 'YRS'),
        ('17cd29de-54a6-448d-b447-4a34e4cffba1'::uuid, 'RPG'),
        ('1a6e5c1d-0966-4a1d-88ab-d9fadd11d91d'::uuid, 'WEG'),
        ('21387c4d-6310-4445-8c48-02718feaaabb'::uuid, 'SRK'),
        ('22ddf8bc-c323-4cc4-8b64-7e7ffa48a3bd'::uuid, 'CTB'),
        ('234cb9ab-030d-4191-9177-9e37846bcf9a'::uuid, 'SBR'),
        ('2440c4ab-8ac5-4a2f-bb93-3f7c016db0e2'::uuid, 'VMA'),
        ('27210ffa-ce53-4417-8324-fae1cb6887e7'::uuid, 'POK'),
        ('29717253-1b65-4035-8e22-347696263934'::uuid, 'PIL'),
        ('2bca1f9d-6511-4350-8306-c1bfbd799566'::uuid, 'PRR'),
        ('33dc4780-c4e1-4346-9b9b-bc475252b8a2'::uuid, 'USB'),
        ('351d5194-8f72-4c7d-bdd9-cecd18691cca'::uuid, 'SQR'),
        ('38f43103-d9be-4e48-8186-0c61070eb6a1'::uuid, 'SBG'),
        ('395e9d85-9660-4b5c-9015-0dbcd37ce194'::uuid, 'HMM'),
        ('39d25a22-dea4-41b1-8af0-c55e501b715c'::uuid, 'COD'),
        ('413a7363-c51e-46e0-8b71-a48054dcae1d'::uuid, 'BON'),
        ('47bdcecf-fe46-4d5e-a4b2-304820c56367'::uuid, 'SLM'),
        ('4b81f63b-655c-44b1-ac06-c2b13dd41b13'::uuid, 'BRB'),
        ('52fee867-bd14-4cd2-8904-f368c9097c01'::uuid, 'TUR'),
        ('64768e97-9b31-4a15-977b-ba31d79f104b'::uuid, 'SPR'),
        ('649d843b-afcb-4c0f-b2a8-de537b76f9d7'::uuid, 'MUR'),
        ('6584ac8d-15a1-43bd-a3b3-8d45bc482814'::uuid, 'BLU'),
        ('680e1bcb-8d4c-45a6-bd8a-fd95e14a75c9'::uuid, 'SDS'),
        ('70083afd-7e2c-4ebf-aa3e-9ce079647c83'::uuid, 'MAC'),
        ('74a25287-ab66-41b2-bc6d-2807ce4d301f'::uuid, 'LTA'),
        ('77553fff-3979-4f02-a16a-61f0a01c261f'::uuid, 'GUU'),
        ('7d5e3175-325e-4173-bf73-20cfa8149027'::uuid, 'PLE'),
        ('7f00612a-ce1c-4380-b227-2d0ec5bc715c'::uuid, 'SMD'),
        ('80bed2d4-d4be-4c67-a39c-b53071cfa116'::uuid, 'TBR'),
        ('80f9836a-acb6-4f89-b35d-44c94bb2f37c'::uuid, 'CBR'),
        ('873477c5-2b2b-448a-a17c-f2c8bcf95c69'::uuid, 'CTC'),
        ('8773301c-08ad-4177-a8a9-0f0e89f13b6d'::uuid, 'LIN'),
        ('8c694860-f6d6-4ab1-a0b5-3a482f4afb6a'::uuid, 'MGR'),
        ('8dacb86b-5b01-4391-b1b6-e0a35188c0d6'::uuid, 'RSE'),
        ('8e08ef70-183e-42a3-a24d-55d248ca5fd2'::uuid, 'HOM'),
        ('8f1bf333-53cd-46e8-823b-34bb120d81c9'::uuid, 'FLE'),
        ('8f333815-a1f5-4be4-a491-705e44c0a304'::uuid, 'SPU'),
        ('904940ce-5da7-40ea-af74-389716e180ef'::uuid, 'GPW'),
        ('926a1d0c-8452-4691-bb5c-d23f13934181'::uuid, 'GUG'),
        ('956ae44a-17a7-4ba2-b122-9f7c4031d9c9'::uuid, 'AMB'),
        ('9862dffd-13e4-4e7e-a50d-93c4b4794c01'::uuid, 'ABZ'),
        ('a4d859a8-31f5-4079-8d7b-435090a64ebc'::uuid, 'BSS'),
        ('aa12f55e-c4fb-4be1-9011-d27e29e3b149'::uuid, 'COE'),
        ('acff734e-fc96-4fc3-b158-803bd4e9342e'::uuid, 'TRS'),
        ('b2e31ceb-aa7b-4f90-aedb-5a0b5e6edce3'::uuid, 'OCC'),
        ('bb4f2007-01e3-40cc-8494-402ab42f1468'::uuid, 'RJE'),
        ('bcefa338-ee77-4d40-8939-14e16e12c236'::uuid, 'RJC'),
        ('c2e84f33-060e-4240-8ff4-126691676371'::uuid, 'GPD'),
        ('c3688abd-716a-4c15-8023-dbb22191f07a'::uuid, 'LEE'),
        ('c8d0c3f8-67a4-4722-9911-b96c64a288fb'::uuid, 'DAB'),
        ('cdec14dc-1717-4c71-908c-8f4bdce40ba3'::uuid, 'HAD'),
        ('cdff3a7d-13c1-43ab-8b4c-026fea407846'::uuid, 'MLR'),
        ('cfdb7cb9-093f-466c-b52f-7eb3ce4b2236'::uuid, 'JOD'),
        ('d19bf161-8459-4ff7-8677-6be6f40ee2b4'::uuid, 'USI'),
        ('d405f530-839c-4a1f-9eb8-1aab0737c6e0'::uuid, 'PAC'),
        ('d93860a9-b51f-464e-b448-f31016783658'::uuid, 'SOL'),
        ('dbe7a1c9-29f9-4620-b5dc-60376973a158'::uuid, 'SYT'),
        ('de0e3718-6ff7-42cc-a446-af6198ebf9b6'::uuid, 'GAR'),
        ('de8827c0-ead9-485e-a96b-68d6fcb54b24'::uuid, 'MEG'),
        ('e2047506-3a07-4b7b-887a-78678c790855'::uuid, 'MUF'),
        ('e6564b80-fb7c-4920-b852-3f7d224e340a'::uuid, 'BVV'),
        ('e6c1fac9-8e11-4447-81a5-fea7306cb6df'::uuid, 'GUR'),
        ('ed21d6cd-cf25-4e41-bcf2-cec413186df4'::uuid, 'SYC'),
        ('ed70b779-68c8-4f71-a6c9-3a0454cd881b'::uuid, 'WHG'),
        ('ee20edc8-ab67-4494-b083-f8a5702e4241'::uuid, 'RJM'),
        ('ee694f1d-353f-421b-846f-fda1b83dedf6'::uuid, 'BOG'),
        ('f0d5a23f-6688-4bb7-a071-073eec8b65c6'::uuid, 'SWA'),
        ('f55d6f7a-92d6-405c-a7b9-538229ac9a4b'::uuid, 'RJU'),
        ('f863e87c-0883-4c07-a896-790bb3b37d16'::uuid, 'BLL'),
        ('f9663a72-68d2-4978-ab35-1d1da19c154d'::uuid, 'POL'),
        ('fa7ffbc6-334d-4f73-869c-cbb0179813e6'::uuid, 'ENX'),
        ('fb41c21b-d0c6-4630-9a03-43bcbcddc5bc'::uuid, 'HER'),
        ('fecf4bb2-f522-4484-b349-6af516ecf70d'::uuid, 'DEC')
)
UPDATE public.species AS s
SET fao_3alpha_code_unique = d.code
FROM data AS d
WHERE s.id = d.id;

COMMIT;

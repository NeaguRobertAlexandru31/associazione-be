--
-- PostgreSQL database dump
--

\restrict ib1nGeAS2UfGDBC9fL8I4KIDmKdaf0KeYtxNpk0DMAdibVPr24uB4APs4Gbnkju

-- Dumped from database version 16.13 (Homebrew)
-- Dumped by pg_dump version 16.13 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: AdminRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AdminRole" AS ENUM (
    'SUPERADMIN',
    'ADMIN'
);


--
-- Name: DocType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DocType" AS ENUM (
    'ci',
    'passaporto',
    'patente'
);


--
-- Name: DonationFrequency; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DonationFrequency" AS ENUM (
    'once',
    'monthly'
);


--
-- Name: DonationMethod; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DonationMethod" AS ENUM (
    'card',
    'bank'
);


--
-- Name: GuardianRelation; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."GuardianRelation" AS ENUM (
    'genitore',
    'tutore_legale'
);


--
-- Name: MemberCategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MemberCategory" AS ENUM (
    'ordinario',
    'under26',
    'sostenitore'
);


--
-- Name: MemberGender; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MemberGender" AS ENUM (
    'm',
    'f',
    'altro'
);


--
-- Name: MemberStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MemberStatus" AS ENUM (
    'in_attesa_pagamento',
    'pagamento_in_corso',
    'attivo',
    'rifiutato'
);


--
-- Name: PaymentMethod; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentMethod" AS ENUM (
    'online',
    'contanti'
);


--
-- Name: ProjectCategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProjectCategory" AS ENUM (
    'cultura',
    'tradizione',
    'sociale',
    'educazione'
);


--
-- Name: ProjectStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProjectStatus" AS ENUM (
    'ongoing',
    'completed'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AdminInvite; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AdminInvite" (
    id text NOT NULL,
    token text NOT NULL,
    "createdById" text NOT NULL,
    "usedAt" timestamp(3) without time zone,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: AdminUser; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AdminUser" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    role public."AdminRole" DEFAULT 'ADMIN'::public."AdminRole" NOT NULL
);


--
-- Name: Article; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Article" (
    id text NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    categories text[],
    images text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ContactMessage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ContactMessage" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    subject text,
    message text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    read boolean DEFAULT false NOT NULL
);


--
-- Name: Donation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Donation" (
    id text NOT NULL,
    "donorName" text,
    "donorEmail" text,
    amount numeric(65,30) NOT NULL,
    frequency public."DonationFrequency" NOT NULL,
    method public."DonationMethod" NOT NULL,
    "stripeSessionId" text,
    "memberId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Event" (
    id text NOT NULL,
    name text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "time" text NOT NULL,
    location text NOT NULL,
    description text,
    images text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    slug text
);


--
-- Name: Guardian; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Guardian" (
    id text NOT NULL,
    "memberId" text NOT NULL,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    "fiscalCode" text NOT NULL,
    relation public."GuardianRelation" NOT NULL,
    "docType" public."DocType" NOT NULL,
    "docNumber" text NOT NULL,
    "docExpiry" timestamp(3) without time zone NOT NULL
);


--
-- Name: Member; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Member" (
    id text NOT NULL,
    email text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "addressCity" text NOT NULL,
    "addressProvince" text NOT NULL,
    "addressStreet" text NOT NULL,
    "addressZip" text NOT NULL,
    "birthDate" timestamp(3) without time zone NOT NULL,
    "birthPlace" text NOT NULL,
    category public."MemberCategory" NOT NULL,
    "docExpiry" timestamp(3) without time zone NOT NULL,
    "docNumber" text NOT NULL,
    "docType" public."DocType" NOT NULL,
    "firstName" text NOT NULL,
    "fiscalCode" text NOT NULL,
    gender public."MemberGender" NOT NULL,
    "isMinor" boolean NOT NULL,
    "lastName" text NOT NULL,
    "membershipYear" integer NOT NULL,
    "paymentMethod" public."PaymentMethod" NOT NULL,
    phone text NOT NULL,
    "privacyBase" boolean NOT NULL,
    "privacyNewsletter" boolean DEFAULT false NOT NULL,
    "privacyThirdParties" boolean DEFAULT false NOT NULL,
    status public."MemberStatus" DEFAULT 'in_attesa_pagamento'::public."MemberStatus" NOT NULL
);


--
-- Name: NewsletterSubscriber; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."NewsletterSubscriber" (
    id text NOT NULL,
    email text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Product; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Product" (
    id text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    author text,
    price numeric(65,30) NOT NULL,
    "originalPrice" numeric(65,30),
    "isNew" boolean,
    images text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Project; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Project" (
    id text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    category public."ProjectCategory" NOT NULL,
    status public."ProjectStatus" NOT NULL,
    images text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Data for Name: AdminInvite; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AdminInvite" (id, token, "createdById", "usedAt", "expiresAt", "createdAt") FROM stdin;
fe91d3dc-7f99-4a42-859a-b708cee02a8e	ac967d9c-589a-44c2-a502-4934e47cb78c	72ec52f6-f99d-401b-a5c2-cf7b524ce5ca	\N	2026-05-08 12:38:06.428	2026-05-01 12:38:06.44
74f19fb9-5f4f-4a97-bd01-7f34bf6079ef	5f11eb04-0a8a-432a-a164-08a323c1967e	72ec52f6-f99d-401b-a5c2-cf7b524ce5ca	2026-05-01 12:39:29.733	2026-05-08 12:39:03.308	2026-05-01 12:39:03.309
72a6a1ff-10ac-46a3-bef4-fda5022d6cb9	60f0ac08-8394-4bdb-a814-fc32f539c4e7	72ec52f6-f99d-401b-a5c2-cf7b524ce5ca	2026-05-01 14:26:21.944	2026-05-08 14:25:51.885	2026-05-01 14:25:51.896
126d7271-44a5-4e51-abec-dd7ec46fb0e4	ddf5eaa4-3534-4156-9afb-af9969a897e5	72ec52f6-f99d-401b-a5c2-cf7b524ce5ca	\N	2026-05-08 16:04:00.69	2026-05-01 16:04:00.703
863769ab-5639-45e1-94a8-2989a3a3dcbb	83076cc8-e3ad-48f8-8ca9-1f821b2304b4	72ec52f6-f99d-401b-a5c2-cf7b524ce5ca	2026-05-01 16:23:47.312	2026-05-08 16:23:18.372	2026-05-01 16:23:18.373
cb875b06-b9d0-47b8-ba83-61b33200d364	05005f32-5cc8-454e-98dc-e960544f4ce7	72ec52f6-f99d-401b-a5c2-cf7b524ce5ca	\N	2026-05-09 15:10:58.608	2026-05-02 15:10:58.619
75f975bc-a4d1-47ef-9194-5a6e31117a92	44c49411-9af4-43e6-ba08-30d9535ea89d	72ec52f6-f99d-401b-a5c2-cf7b524ce5ca	\N	2026-05-10 13:09:36.533	2026-05-03 13:09:36.543
cb7243ec-62c6-4780-aacc-c2222480f8ea	9b1e8ca5-5e8c-4b90-921c-b1d37805b97f	72ec52f6-f99d-401b-a5c2-cf7b524ce5ca	\N	2026-05-10 13:09:37.986	2026-05-03 13:09:37.986
a4cfe406-ea26-435e-b41d-fea47104c379	d22fa4b7-abda-43e9-8390-447a46125f79	72ec52f6-f99d-401b-a5c2-cf7b524ce5ca	\N	2026-05-10 13:09:38.602	2026-05-03 13:09:38.603
752a336a-8693-4563-85d3-94e5a39d422f	99a31fdd-4832-45d5-b9a0-0c0d8f52a9f4	72ec52f6-f99d-401b-a5c2-cf7b524ce5ca	\N	2026-05-10 13:09:39.119	2026-05-03 13:09:39.12
1956fe42-1cda-48f4-9de1-d26d70c3b79e	14844b6b-2fbe-42f5-8db1-83ab09dc1e0e	72ec52f6-f99d-401b-a5c2-cf7b524ce5ca	\N	2026-05-10 13:09:49.035	2026-05-03 13:09:49.036
ede05ba7-283c-4f4e-bccf-b3585e969a86	67d35291-26fc-44af-89be-3f48ab4c2a7a	72ec52f6-f99d-401b-a5c2-cf7b524ce5ca	\N	2026-05-10 13:09:50.001	2026-05-03 13:09:50.001
0460b9f0-4d5e-4cd0-a22a-c7fcd6559f2a	9485ff12-3f69-4e01-a948-171df9e1cf94	72ec52f6-f99d-401b-a5c2-cf7b524ce5ca	\N	2026-05-10 13:26:14.826	2026-05-03 13:26:14.826
\.


--
-- Data for Name: AdminUser; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AdminUser" (id, name, email, "passwordHash", "createdAt", "updatedAt", role) FROM stdin;
b2cbe01a-dcbd-49d0-b7fb-766d2180a2e9	Admin	admin@associazione.it	$2b$10$IlRIiAyAvFUYm/fdVm2pAeY0ItSQ8bwAlbMyepVCpyP2IcTRo/TfO	2026-05-01 11:54:05.578	2026-05-01 11:54:05.578	ADMIN
3eb6fd53-d840-4196-aaf9-f1eec7594e4e	Mihaela Carmen Neagu 	mihaela.c.mcn@gmail.com	$2b$10$HPyZRdgSXlb4fc.n/HCcLOXZC.ZFkv2WvygGRIaYoxBxLm21exYEe	2026-05-01 12:39:29.738	2026-05-01 12:39:29.738	ADMIN
4c071a72-68fb-44b1-b27f-156fe815fb99	sergiu	sergiu@test.com	$2b$10$bbS2kDdgGI5GTKgprX4LM.qpBC.b3fdZCep77b6rMsDWjl1X1Sr6m	2026-05-01 14:26:21.954	2026-05-01 14:26:21.954	ADMIN
2bb65da8-26e0-4f50-a365-bca5f80b9248	Angelica Biondo	biondoangelica2002@gmail.com	$2b$10$oJfFLE.rVkq326a9gVlQ4uM3M2P3f5IHlW.bpO0T5HOGQxoEIhlAS	2026-05-01 16:23:47.32	2026-05-01 16:23:47.32	ADMIN
72ec52f6-f99d-401b-a5c2-cf7b524ce5ca	Neagu Robert Alexandru	neagurobertalexandru@gmail.com	$2b$10$jweaVRSirsdZTlhGJ.Y2JeC1sfDUVyYVwjddC7AWmixxlBKhJ22Du	2026-05-01 12:00:21.319	2026-05-03 13:26:49.868	SUPERADMIN
\.


--
-- Data for Name: Article; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Article" (id, name, description, categories, images, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ContactMessage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ContactMessage" (id, name, email, subject, message, "createdAt", read) FROM stdin;
406c744b-063f-41f4-97a5-0c4397abe348	Mario Rossi	mario@example.com	Oggetto opzionale	Testo del messaggio	2026-05-02 15:18:59.349	t
b0e8d18c-05bb-483c-81c1-12f28808cd1d	robert.neagu@codeploy.it	neagurobertalexandru@gmail.com	asd	asd	2026-05-02 15:27:30.094	t
676606a5-8231-4d2a-a936-34ea8364d5bd	Mario	mario@test.com		test messaggio	2026-05-02 15:24:35.652	t
1a14e067-4157-43c2-95f6-b5abe23a744d	Test	test@test.com	\N	ciao	2026-05-02 15:23:27.301	t
7c0e8800-fc1c-4824-bf01-e1acb41fa2af	Robert Alexandru	neagurobertalexandru@gmail.com	ytfiytfiytf tftyfytf itfytfytfiy	yfguyguyguig	2026-05-02 17:17:55.506	t
10e68d0a-a1b1-465d-ba8c-8b1e465f679b	test 	test@test.com	aiutatemi 	perfavore 	2026-05-03 11:06:22.484	t
\.


--
-- Data for Name: Donation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Donation" (id, "donorName", "donorEmail", amount, frequency, method, "stripeSessionId", "memberId", "createdAt") FROM stdin;
\.


--
-- Data for Name: Event; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Event" (id, name, date, "time", location, description, images, "createdAt", "updatedAt", slug) FROM stdin;
1be4ccaa-c14f-4b4b-a13b-313d35be006f	dfgdfg	2026-05-30 00:00:00	16:18	dfgdfg	dfgdfg	{/uploads/events/c5f43f106298787f779b.jpeg}	2026-05-02 11:15:23.23	2026-05-02 11:15:23.23	dfgdfg-1be4ccaa
c4eeea48-dc25-4b2a-953c-0b9037c5e6bf	test di un evento 	2026-05-09 00:00:00	22:22	torino e bricherasio 	descrizione lunga descrizione lunga descrizione lunga descrizione lunga descrizione lunga descrizione lunga descrizione lunga vdescrizione lunga vvvvvdescrizione lunga descrizione lunga descrizione lunga descrizione lunga descrizione lunga descrizione lunga descrizione lunga descrizione lunga 	{/uploads/events/bfdc271800273b9e839b.JPG,/uploads/events/7a931ee8ee05aac4e3cb.jpeg}	2026-05-02 17:20:27.578	2026-05-02 17:20:27.578	test-di-un-evento-c4eeea48
7360eeda-4537-4805-8f62-b3dcb59b1434	ghfdcykgu	2026-05-14 00:00:00	15:05	gfdfhf	hfhjglglgli	{/uploads/events/0f1319ff49ba549ed77a.jpeg}	2026-05-03 11:04:21.436	2026-05-03 11:04:21.436	ghfdcykgu-7360eeda
\.


--
-- Data for Name: Guardian; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Guardian" (id, "memberId", "firstName", "lastName", "fiscalCode", relation, "docType", "docNumber", "docExpiry") FROM stdin;
68395c3f-70d8-4a6c-80b9-38a8821391e2	55275d2e-7f70-4d6c-94b4-655e43c108fb	Anna	Rossi	RSSNNX60A41H501Y	genitore	ci	CD789012	2027-06-01 00:00:00
69f7b8ea-366a-4b25-8994-857df2c549b5	954cdf43-7752-4f79-9271-928fa1c4fdd4	Robert Alexandru	Neagu	NGERRT01A31Z129D	genitore	ci	CI129DI	2045-01-23 00:00:00
bc23d83b-a283-457d-b853-5ed574bf2081	a97e4958-91cf-4be3-8ddd-8d5571fedb4f	Antonietta 	Caggiano 	ASDASD12D12D123F	genitore	ci	123df34	3045-04-23 00:00:00
\.


--
-- Data for Name: Member; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Member" (id, email, "createdAt", "updatedAt", "addressCity", "addressProvince", "addressStreet", "addressZip", "birthDate", "birthPlace", category, "docExpiry", "docNumber", "docType", "firstName", "fiscalCode", gender, "isMinor", "lastName", "membershipYear", "paymentMethod", phone, "privacyBase", "privacyNewsletter", "privacyThirdParties", status) FROM stdin;
43ef75c7-7c55-4d93-a765-d633dba68fdd	mario@example.com	2026-05-01 14:50:03.073	2026-05-01 14:50:03.073	Roma	RM	Via Roma 1	00100	1985-08-01 00:00:00	Roma	ordinario	2028-01-01 00:00:00	AB123456	ci	Mario	RSSMRA85M01H501Z	m	f	Rossi	2026	contanti	+393331234567	t	f	f	in_attesa_pagamento
55275d2e-7f70-4d6c-94b4-655e43c108fb	mario@example.com	2026-05-01 14:53:14.079	2026-05-01 14:53:14.079	Roma	RM	Via Roma 1	00100	2012-08-01 00:00:00	Roma	ordinario	2028-01-01 00:00:00	AB123456	ci	Mario	RSSMRA85M01H501V	m	t	Rossi	2026	contanti	+393331234567	t	f	f	in_attesa_pagamento
163c074f-6d2b-48fe-aa24-386a8db95e2b	biondoangelica2002@gmail.com	2026-05-01 15:59:05.36	2026-05-01 15:59:05.36	Atlantide	MM	Via Mario rossi 21	00101	2002-11-05 00:00:00	Moncalieri	sostenitore	2026-05-27 00:00:00	eocnjodnco	ci	Angelica	BNDNLC02S45F335V	altro	f	Biondo	2026	online	3463660177	t	f	f	pagamento_in_corso
954cdf43-7752-4f79-9271-928fa1c4fdd4	neagurobertalexandru@gmail.com	2026-05-01 16:29:34.645	2026-05-01 16:29:34.645	Bricherasio	TO	Via Brignone 11	10060	2001-01-31 00:00:00	Romania	ordinario	2030-01-31 00:00:00	ci129di	ci	Robert Alexandru	NGERRT01A31Z129D	m	t	Neagu	2026	online	3293171493	t	t	t	pagamento_in_corso
a97e4958-91cf-4be3-8ddd-8d5571fedb4f	biondoraffaele@gmail.com	2026-05-01 16:32:30.379	2026-05-01 16:32:30.379	Osasco	TO	Via Martiri della Libertà 97	10060	2012-11-05 00:00:00	Pinerolo 	under26	2030-01-23 00:00:00	AC456lk	ci	Raffaele	ASDASD12D12D123F	m	t	Biondo	2026	online	123123123	t	t	t	pagamento_in_corso
71c8f92a-9d39-4cc1-9463-3b636970b1c9	neagurobertalexandru@gmail.com	2026-05-03 11:14:26.881	2026-05-03 11:14:26.881	Atlantide	MM	Via Mario rossi 21	00101	2001-01-31 00:00:00	Romania	sostenitore	2026-05-28 00:00:00	ci123df	ci	Robert Alexandru	NGERRT01A31Z129H	m	f	Neagu	2026	contanti	3463660177	t	t	t	in_attesa_pagamento
\.


--
-- Data for Name: NewsletterSubscriber; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."NewsletterSubscriber" (id, email, "createdAt") FROM stdin;
\.


--
-- Data for Name: Product; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Product" (id, title, description, category, author, price, "originalPrice", "isNew", images, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Project; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Project" (id, title, description, category, status, images, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
deaf08e6-8713-480f-a8ae-609255ccb4f9	39aeee020adf66b6fb46d619464af1115e0d7a960cce8480e7a5ef0ee1a10107	2026-05-01 13:23:37.466854+02	20260501112337_init	\N	\N	2026-05-01 13:23:37.452852+02	1
3751396d-6fc3-4ae6-b69a-7780a93da892	882d45afb7343f61264abc9dd5094c8eae73a11045efe7aa2873f83e84055203	2026-05-01 14:33:55.132644+02	20260501123355_add_roles_and_invites	\N	\N	2026-05-01 14:33:55.125361+02	1
\.


--
-- Name: AdminInvite AdminInvite_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AdminInvite"
    ADD CONSTRAINT "AdminInvite_pkey" PRIMARY KEY (id);


--
-- Name: AdminUser AdminUser_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AdminUser"
    ADD CONSTRAINT "AdminUser_pkey" PRIMARY KEY (id);


--
-- Name: Article Article_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Article"
    ADD CONSTRAINT "Article_pkey" PRIMARY KEY (id);


--
-- Name: ContactMessage ContactMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContactMessage"
    ADD CONSTRAINT "ContactMessage_pkey" PRIMARY KEY (id);


--
-- Name: Donation Donation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Donation"
    ADD CONSTRAINT "Donation_pkey" PRIMARY KEY (id);


--
-- Name: Event Event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Event"
    ADD CONSTRAINT "Event_pkey" PRIMARY KEY (id);


--
-- Name: Guardian Guardian_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Guardian"
    ADD CONSTRAINT "Guardian_pkey" PRIMARY KEY (id);


--
-- Name: Member Member_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Member"
    ADD CONSTRAINT "Member_pkey" PRIMARY KEY (id);


--
-- Name: NewsletterSubscriber NewsletterSubscriber_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NewsletterSubscriber"
    ADD CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY (id);


--
-- Name: Product Product_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY (id);


--
-- Name: Project Project_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: AdminInvite_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AdminInvite_token_key" ON public."AdminInvite" USING btree (token);


--
-- Name: AdminUser_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AdminUser_email_key" ON public."AdminUser" USING btree (email);


--
-- Name: Event_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Event_slug_key" ON public."Event" USING btree (slug);


--
-- Name: Guardian_memberId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Guardian_memberId_key" ON public."Guardian" USING btree ("memberId");


--
-- Name: Member_fiscalCode_membershipYear_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Member_fiscalCode_membershipYear_key" ON public."Member" USING btree ("fiscalCode", "membershipYear");


--
-- Name: NewsletterSubscriber_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON public."NewsletterSubscriber" USING btree (email);


--
-- Name: AdminInvite AdminInvite_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AdminInvite"
    ADD CONSTRAINT "AdminInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."AdminUser"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Donation Donation_memberId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Donation"
    ADD CONSTRAINT "Donation_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES public."Member"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Guardian Guardian_memberId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Guardian"
    ADD CONSTRAINT "Guardian_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES public."Member"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict ib1nGeAS2UfGDBC9fL8I4KIDmKdaf0KeYtxNpk0DMAdibVPr24uB4APs4Gbnkju


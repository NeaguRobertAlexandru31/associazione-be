--
-- PostgreSQL database dump
--

\restrict Kob5k76DexBqRzmAeeCQXLf9fR6kljdod5MoNAFPR2UGIU5J5unAnScYcKg7ngD

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: robertalexandruneagu
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO robertalexandruneagu;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: robertalexandruneagu
--

COMMENT ON SCHEMA public IS '';


--
-- Name: BookingStatus; Type: TYPE; Schema: public; Owner: robertalexandruneagu
--

CREATE TYPE public."BookingStatus" AS ENUM (
    'confirmed',
    'waitlist',
    'cancelled'
);


ALTER TYPE public."BookingStatus" OWNER TO robertalexandruneagu;

--
-- Name: DocType; Type: TYPE; Schema: public; Owner: robertalexandruneagu
--

CREATE TYPE public."DocType" AS ENUM (
    'ci',
    'passaporto',
    'patente'
);


ALTER TYPE public."DocType" OWNER TO robertalexandruneagu;

--
-- Name: DocumentCategory; Type: TYPE; Schema: public; Owner: robertalexandruneagu
--

CREATE TYPE public."DocumentCategory" AS ENUM (
    'verbale',
    'statuto',
    'regolamento',
    'bilancio',
    'altro'
);


ALTER TYPE public."DocumentCategory" OWNER TO robertalexandruneagu;

--
-- Name: DonationFrequency; Type: TYPE; Schema: public; Owner: robertalexandruneagu
--

CREATE TYPE public."DonationFrequency" AS ENUM (
    'once',
    'monthly'
);


ALTER TYPE public."DonationFrequency" OWNER TO robertalexandruneagu;

--
-- Name: DonationMethod; Type: TYPE; Schema: public; Owner: robertalexandruneagu
--

CREATE TYPE public."DonationMethod" AS ENUM (
    'card',
    'bank'
);


ALTER TYPE public."DonationMethod" OWNER TO robertalexandruneagu;

--
-- Name: EventAccessType; Type: TYPE; Schema: public; Owner: robertalexandruneagu
--

CREATE TYPE public."EventAccessType" AS ENUM (
    'public',
    'limited',
    'members_only'
);


ALTER TYPE public."EventAccessType" OWNER TO robertalexandruneagu;

--
-- Name: GuardianRelation; Type: TYPE; Schema: public; Owner: robertalexandruneagu
--

CREATE TYPE public."GuardianRelation" AS ENUM (
    'genitore',
    'tutore_legale'
);


ALTER TYPE public."GuardianRelation" OWNER TO robertalexandruneagu;

--
-- Name: MemberCategory; Type: TYPE; Schema: public; Owner: robertalexandruneagu
--

CREATE TYPE public."MemberCategory" AS ENUM (
    'ordinario',
    'under26',
    'sostenitore'
);


ALTER TYPE public."MemberCategory" OWNER TO robertalexandruneagu;

--
-- Name: MemberGender; Type: TYPE; Schema: public; Owner: robertalexandruneagu
--

CREATE TYPE public."MemberGender" AS ENUM (
    'm',
    'f',
    'altro'
);


ALTER TYPE public."MemberGender" OWNER TO robertalexandruneagu;

--
-- Name: MemberStatus; Type: TYPE; Schema: public; Owner: robertalexandruneagu
--

CREATE TYPE public."MemberStatus" AS ENUM (
    'in_attesa_pagamento',
    'pagamento_in_corso',
    'attivo',
    'rifiutato'
);


ALTER TYPE public."MemberStatus" OWNER TO robertalexandruneagu;

--
-- Name: PaymentMethod; Type: TYPE; Schema: public; Owner: robertalexandruneagu
--

CREATE TYPE public."PaymentMethod" AS ENUM (
    'online',
    'contanti'
);


ALTER TYPE public."PaymentMethod" OWNER TO robertalexandruneagu;

--
-- Name: ProjectCategory; Type: TYPE; Schema: public; Owner: robertalexandruneagu
--

CREATE TYPE public."ProjectCategory" AS ENUM (
    'cultura',
    'tradizione',
    'sociale',
    'educazione'
);


ALTER TYPE public."ProjectCategory" OWNER TO robertalexandruneagu;

--
-- Name: ProjectStatus; Type: TYPE; Schema: public; Owner: robertalexandruneagu
--

CREATE TYPE public."ProjectStatus" AS ENUM (
    'ongoing',
    'completed'
);


ALTER TYPE public."ProjectStatus" OWNER TO robertalexandruneagu;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: robertalexandruneagu
--

CREATE TYPE public."UserRole" AS ENUM (
    'SUPERADMIN',
    'ADMIN',
    'MEMBER'
);


ALTER TYPE public."UserRole" OWNER TO robertalexandruneagu;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Article; Type: TABLE; Schema: public; Owner: robertalexandruneagu
--

CREATE TABLE public."Article" (
    id text NOT NULL,
    name text NOT NULL,
    categories text[],
    blocks jsonb DEFAULT '[]'::jsonb NOT NULL,
    cover text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Article" OWNER TO robertalexandruneagu;

--
-- Name: Booking; Type: TABLE; Schema: public; Owner: robertalexandruneagu
--

CREATE TABLE public."Booking" (
    id text NOT NULL,
    "eventId" text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    seats integer NOT NULL,
    status public."BookingStatus" DEFAULT 'confirmed'::public."BookingStatus" NOT NULL,
    "position" integer,
    "cancelToken" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Booking" OWNER TO robertalexandruneagu;

--
-- Name: ContactMessage; Type: TABLE; Schema: public; Owner: robertalexandruneagu
--

CREATE TABLE public."ContactMessage" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    subject text,
    message text NOT NULL,
    read boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ContactMessage" OWNER TO robertalexandruneagu;

--
-- Name: Document; Type: TABLE; Schema: public; Owner: robertalexandruneagu
--

CREATE TABLE public."Document" (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    category public."DocumentCategory" NOT NULL,
    "fileUrl" text NOT NULL,
    "fileName" text NOT NULL,
    "fileSize" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Document" OWNER TO robertalexandruneagu;

--
-- Name: Donation; Type: TABLE; Schema: public; Owner: robertalexandruneagu
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


ALTER TABLE public."Donation" OWNER TO robertalexandruneagu;

--
-- Name: Event; Type: TABLE; Schema: public; Owner: robertalexandruneagu
--

CREATE TABLE public."Event" (
    id text NOT NULL,
    slug text,
    name text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "time" text NOT NULL,
    location text NOT NULL,
    description text,
    images text[],
    cover text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "uploadToken" text,
    "uploadUrl" text,
    capacity integer,
    "hasCapacity" boolean DEFAULT false NOT NULL,
    "accessType" public."EventAccessType" DEFAULT 'public'::public."EventAccessType" NOT NULL
);


ALTER TABLE public."Event" OWNER TO robertalexandruneagu;

--
-- Name: EventPhoto; Type: TABLE; Schema: public; Owner: robertalexandruneagu
--

CREATE TABLE public."EventPhoto" (
    id text NOT NULL,
    "eventId" text NOT NULL,
    url text NOT NULL,
    approved boolean DEFAULT false NOT NULL,
    "tokenSub" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "isMember" boolean DEFAULT false NOT NULL,
    "uploaderEmail" text,
    "uploaderName" text
);


ALTER TABLE public."EventPhoto" OWNER TO robertalexandruneagu;

--
-- Name: EventRsvp; Type: TABLE; Schema: public; Owner: robertalexandruneagu
--

CREATE TABLE public."EventRsvp" (
    id text NOT NULL,
    "eventId" text NOT NULL,
    name text NOT NULL,
    email text,
    status text DEFAULT 'attending'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."EventRsvp" OWNER TO robertalexandruneagu;

--
-- Name: Guardian; Type: TABLE; Schema: public; Owner: robertalexandruneagu
--

CREATE TABLE public."Guardian" (
    id text NOT NULL,
    "memberId" text NOT NULL,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    "fiscalCode" text NOT NULL,
    "fiscalCodeHash" text,
    relation public."GuardianRelation" NOT NULL,
    "docType" public."DocType" NOT NULL,
    "docNumber" text NOT NULL,
    "docExpiry" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Guardian" OWNER TO robertalexandruneagu;

--
-- Name: Member; Type: TABLE; Schema: public; Owner: robertalexandruneagu
--

CREATE TABLE public."Member" (
    id text NOT NULL,
    "isMinor" boolean DEFAULT false NOT NULL,
    category public."MemberCategory" DEFAULT 'ordinario'::public."MemberCategory" NOT NULL,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    "fiscalCode" text,
    "fiscalCodeHash" text,
    "birthDate" timestamp(3) without time zone,
    "birthPlace" text,
    gender public."MemberGender",
    "docType" public."DocType",
    "docNumber" text,
    "docExpiry" timestamp(3) without time zone,
    email text NOT NULL,
    phone text,
    "addressStreet" text,
    "addressZip" text,
    "addressCity" text,
    "addressProvince" text,
    status public."MemberStatus" DEFAULT 'in_attesa_pagamento'::public."MemberStatus" NOT NULL,
    "membershipYear" integer,
    "paymentMethod" public."PaymentMethod",
    "privacyBase" boolean DEFAULT false NOT NULL,
    "privacyNewsletter" boolean DEFAULT false NOT NULL,
    "privacyThirdParties" boolean DEFAULT false NOT NULL,
    "passwordHash" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "profileImage" text,
    "boardRoles" text[],
    role public."UserRole" DEFAULT 'MEMBER'::public."UserRole" NOT NULL,
    "pagePermissions" jsonb
);


ALTER TABLE public."Member" OWNER TO robertalexandruneagu;

--
-- Name: NewsletterSubscriber; Type: TABLE; Schema: public; Owner: robertalexandruneagu
--

CREATE TABLE public."NewsletterSubscriber" (
    id text NOT NULL,
    email text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."NewsletterSubscriber" OWNER TO robertalexandruneagu;

--
-- Name: OtpCode; Type: TABLE; Schema: public; Owner: robertalexandruneagu
--

CREATE TABLE public."OtpCode" (
    id text NOT NULL,
    email text NOT NULL,
    code text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "usedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."OtpCode" OWNER TO robertalexandruneagu;

--
-- Name: Product; Type: TABLE; Schema: public; Owner: robertalexandruneagu
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


ALTER TABLE public."Product" OWNER TO robertalexandruneagu;

--
-- Name: Project; Type: TABLE; Schema: public; Owner: robertalexandruneagu
--

CREATE TABLE public."Project" (
    id text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    category public."ProjectCategory" NOT NULL,
    status public."ProjectStatus" NOT NULL,
    images text[],
    cover text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Project" OWNER TO robertalexandruneagu;

--
-- Name: SiteSetting; Type: TABLE; Schema: public; Owner: robertalexandruneagu
--

CREATE TABLE public."SiteSetting" (
    key text NOT NULL,
    value text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SiteSetting" OWNER TO robertalexandruneagu;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: robertalexandruneagu
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


ALTER TABLE public._prisma_migrations OWNER TO robertalexandruneagu;

--
-- Data for Name: Article; Type: TABLE DATA; Schema: public; Owner: robertalexandruneagu
--

COPY public."Article" (id, name, categories, blocks, cover, "createdAt", "updatedAt") FROM stdin;
c786ba53-2f70-4e87-9a34-0cdba232819f	articolo molto utile	{artigianato}	[{"image": "https://d352fqmooqp9ew.cloudfront.net/articles/ef016affd2ec71182348.webp", "subtitle": "sottotiolo", "paragraph": " asdnjksdn osadjf asdnjksdn osadjf asdnjksdn osadjf asdnjksdn osadjf asdnjksdn osadjf asdnjksdn osadjf asdnjksdn osadjf asdnjksdn osadjf asdnjksdn osadjf asdnjksdn osadjf asdnjksdn osadjf asdnjksdn osadjf asdnjksdn osadjf asdnjksdn osadjf asdnjksdn osadjf asdnjksdn osadjf asdnjksdn osadjf "}, {"image": "https://d352fqmooqp9ew.cloudfront.net/articles/ab60c27af0a05fb08f2a.webp", "subtitle": "asdasds", "paragraph": "asdf asdnjksdn osadjf asdnjksdn osadjf asdnjksdn osadjf asdnjksdn osadjf asdnjksdn osadjf asdnjksdn osadjf asdnjksdn osadjf asdnjksdn osadjf asdnjksdn osadjf asdnjksdn osadjf asdnjksdn osadjf asdnjksdn osadjf asdnjksdn osadjf asdnjksdn osadjf asdnjksdn osadjf asdnjksdn osadjf asdnjksdn osadjf "}, {"image": "https://d352fqmooqp9ew.cloudfront.net/articles/e46020e529f0ccd6b0b8.webp", "subtitle": "sdfssd", "paragraph": "asdnjksdn osadjf asdnjksdn osadjf asdnjksdn osadjf asdnjksdn osadjf asdnjksdn osadjf asdnjksdn osadjf asdnjksdn osadjf asdnjksdn osadjf asdnjksdn osadjf "}]	https://d352fqmooqp9ew.cloudfront.net/articles/77d0c0492651b6fb244d.webp	2026-10-03 18:28:32.433	2026-10-03 18:28:32.433
\.


--
-- Data for Name: Booking; Type: TABLE DATA; Schema: public; Owner: robertalexandruneagu
--

COPY public."Booking" (id, "eventId", name, email, phone, seats, status, "position", "cancelToken", "createdAt") FROM stdin;
cmutkjcpf0000upzbdv0vr6ld	0119119c-1d6f-414e-8bf3-566727b3086f	robert neagu	neagurobertalexandru@gmail.com	1231231231	2	confirmed	\N	cmutkjcpf0001upzb7b5f1chb	2026-10-04 08:38:14.547
cmutntwv70000razbw38k4kpk	39b6e70f-c37f-499a-965b-6637a319a824	Mihaela	neagurobertalexandru@gmail.com	134848464	2	confirmed	\N	cmutntwv70001razbjwicj4fj	2026-10-04 10:10:26.083
\.


--
-- Data for Name: ContactMessage; Type: TABLE DATA; Schema: public; Owner: robertalexandruneagu
--

COPY public."ContactMessage" (id, name, email, subject, message, read, "createdAt") FROM stdin;
\.


--
-- Data for Name: Document; Type: TABLE DATA; Schema: public; Owner: robertalexandruneagu
--

COPY public."Document" (id, title, description, category, "fileUrl", "fileName", "fileSize", "createdAt", "updatedAt") FROM stdin;
d4594bde-ce51-444b-be8d-1259f948e22b	asd	asd	regolamento	https://d352fqmooqp9ew.cloudfront.net/documents/85218b0bedf9ba819370.pdf	atto costitutivo e statuto associazione.pdf	1130252	2026-09-26 12:08:43.42	2026-09-26 12:08:43.42
\.


--
-- Data for Name: Donation; Type: TABLE DATA; Schema: public; Owner: robertalexandruneagu
--

COPY public."Donation" (id, "donorName", "donorEmail", amount, frequency, method, "stripeSessionId", "memberId", "createdAt") FROM stdin;
012f113a-f200-422f-96f6-41fca61778fd	123	neagurobertalexandru@gmail.com	25.000000000000000000000000000000	once	card	\N	\N	2026-09-25 13:15:08.524
\.


--
-- Data for Name: Event; Type: TABLE DATA; Schema: public; Owner: robertalexandruneagu
--

COPY public."Event" (id, slug, name, date, "time", location, description, images, cover, "createdAt", "updatedAt", "uploadToken", "uploadUrl", capacity, "hasCapacity", "accessType") FROM stdin;
0119119c-1d6f-414e-8bf3-566727b3086f	test-check-telegram-0119119c	test check telegram 	2026-10-23 00:00:00	12:12	12	12	{https://d352fqmooqp9ew.cloudfront.net/events/954b25d2e6fe46b2ce58.webp,https://d352fqmooqp9ew.cloudfront.net/events/97ee1f2b0aac675efb91.webp,https://d352fqmooqp9ew.cloudfront.net/events/70e614a596a8aece10d7.webp}	https://d352fqmooqp9ew.cloudfront.net/events/3ef6dacbafde19e83411.webp	2026-10-04 08:37:45.787	2026-10-04 08:37:58.706	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTE5MTE5Yy0xZDZmLTQxNGUtOGJmMy01NjY3MjdiMzA4NmYiLCJpYXQiOjE3OTExMDMwNzgsImV4cCI6MTc5Mjk3MjgwMH0.mEbhsBZrD0lIfrp1p9wEGhht4mrTPUfP0g8IKZyAYhE	/events/test-check-telegram-0119119c/upload?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTE5MTE5Yy0xZDZmLTQxNGUtOGJmMy01NjY3MjdiMzA4NmYiLCJpYXQiOjE3OTExMDMwNzgsImV4cCI6MTc5Mjk3MjgwMH0.mEbhsBZrD0lIfrp1p9wEGhht4mrTPUfP0g8IKZyAYhE	4	t	limited
39b6e70f-c37f-499a-965b-6637a319a824	test-39b6e70f	Test	2026-10-23 00:00:00	12:09	Torino	Descri	{}	https://d352fqmooqp9ew.cloudfront.net/events/5888876c2d284eae12ab.webp	2026-10-04 10:09:17.322	2026-10-04 10:09:59.531	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzOWI2ZTcwZi1jMzdmLTQ5OWEtOTY1Yi02NjM3YTMxOWE4MjQiLCJpYXQiOjE3OTExMDg1OTksImV4cCI6MTc5Mjk3MjgwMH0.VH5GcKg2SGEfvMrJzu8CzMFuuocQt0NEQOaY22zpKbE	/events/test-39b6e70f/upload?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzOWI2ZTcwZi1jMzdmLTQ5OWEtOTY1Yi02NjM3YTMxOWE4MjQiLCJpYXQiOjE3OTExMDg1OTksImV4cCI6MTc5Mjk3MjgwMH0.VH5GcKg2SGEfvMrJzu8CzMFuuocQt0NEQOaY22zpKbE	23	t	limited
\.


--
-- Data for Name: EventPhoto; Type: TABLE DATA; Schema: public; Owner: robertalexandruneagu
--

COPY public."EventPhoto" (id, "eventId", url, approved, "tokenSub", "createdAt", "isMember", "uploaderEmail", "uploaderName") FROM stdin;
\.


--
-- Data for Name: EventRsvp; Type: TABLE DATA; Schema: public; Owner: robertalexandruneagu
--

COPY public."EventRsvp" (id, "eventId", name, email, status, "createdAt") FROM stdin;
\.


--
-- Data for Name: Guardian; Type: TABLE DATA; Schema: public; Owner: robertalexandruneagu
--

COPY public."Guardian" (id, "memberId", "firstName", "lastName", "fiscalCode", "fiscalCodeHash", relation, "docType", "docNumber", "docExpiry") FROM stdin;
\.


--
-- Data for Name: Member; Type: TABLE DATA; Schema: public; Owner: robertalexandruneagu
--

COPY public."Member" (id, "isMinor", category, "firstName", "lastName", "fiscalCode", "fiscalCodeHash", "birthDate", "birthPlace", gender, "docType", "docNumber", "docExpiry", email, phone, "addressStreet", "addressZip", "addressCity", "addressProvince", status, "membershipYear", "paymentMethod", "privacyBase", "privacyNewsletter", "privacyThirdParties", "passwordHash", "createdAt", "updatedAt", "deletedAt", "profileImage", "boardRoles", role, "pagePermissions") FROM stdin;
32020dcd-50fa-405a-b698-19c6c79333f6	f	ordinario	Robert Alexandru	Neagu	/N/pAm+HGEPl29wi:IYK35uLkCCfnL4nWRvZDjQ==:b0v1RuBBpJZtTL7ZVynlfQ==	2277c3cf9d6ff795c8f49f69398dfdbe79e67b1291a145e1be841e7fd0c0bc76	2001-01-31 00:00:00	rUpo+fEcaBAa1zHo:88L4xDmg1z0Qv5ULKQbq9Q==:Ag1r9rKRZg==	m	ci	EBb9CI50X64SYX4A:GcSXPeipLhRdNW1vyKp7Aw==:rh8coUDXlQ==	2030-01-31 00:00:00	neagurobertalexandru@gmail.com	IOEjR6XMVUrPyf8Q:1wyTcGDjTBCe4DlTDIlcog==:OMVETddj2QS4Sw==	Zg1nyJWNzaLJMICE:nhNOdyDxCRBMMzhDcfPCpw==:+7gKQ+prt5a7iBUsCd6ZmA==	gObo66dRumqe/Wn3:dMn8te83RpgrMFry02UBoA==:CMzuXps=	6erIweUXKBo7jM2R:iX4VLgMZfJNrGt7x206ktw==:SGSNqGxWctZLs2A=	AsO98UQERUxbRC/N:hslCqvLuZXKeoX4OFYBOfw==:w7Y=	attivo	\N	\N	t	f	f	$2b$10$xqenpK9zoFZTQMsSneU0puwPOOt7xWzAE/8g.gfN8/XGngHPbwzvG	2026-09-12 13:52:47.26	2026-09-12 13:58:27.913	\N	https://pub-7c471637e38d4bc2914d5ae9b118f8e7.r2.dev/avatars/6695e12d4cf88a67e43f.webp	{}	SUPERADMIN	\N
74223da5-91cb-4956-a0f0-b91f09cc6acc	f	sostenitore	asd	asd	zkYXeGlh3pTmRNSD:jUryHDrWDIc+grFXcl1Qmg==:Z77R7dmtgJCcf1v7Kge4eQ==	77de3309fcfcf2a27ae69c449c9ec2bab73bbbd29ef25ea0965bbfc7472a0784	2001-01-31 00:00:00	befboBOrtqNKbuXJ:s74uiGm+QFLIzNY78KZ9vQ==:RHeF	m	ci	Kh9eMHA8M2l5hlrc:CeYWwvSWqNth0H0dMHArnw==:KxVJWTpZ9AcS	2030-01-31 00:00:00	neagurobertalexandru+email@gmail.com	Elh4R/o52yq/QEOq:3gGgez3WcWCucy1i0AT0Xw==:DYjm	QtpvhRAAfBG5kx52:hnlaugg1QXd0k3bDASy/cQ==:Uuzv3B0=	gXkte3OBj2HoivHx:cXtIUzOtpuqNHQbK9GYXYQ==:RyBM	p7pxDmVFLAXpSxTf:8lf06vcP0EZFcbRR5kC/jQ==:ec3t	DVV974UpeWRtNruF:llD3aWUNs7MRPRo1xDSsgQ==:KaU=	attivo	2026	contanti	t	f	f	$2b$10$zxUIHRewK.AHUFM7y9rdAeivOfReu7YLrHigv6GJnZlV0mxu5eO8e	2026-09-26 11:00:29.855	2026-09-26 13:54:32.301	\N	\N	{responsabile_eventi}	ADMIN	{"news": false, "events": false, "members": false, "messages": false, "overview": false, "projects": false, "documents": true, "donations": false, "activities": false}
8db36391-f676-467a-b754-54f973597b90	f	sostenitore	Angelica	Biondo	AlrnpF1YAqOY/9Ha:9gMz3firs9NbYrjEEyykJw==:W0GzIPYUhK33B3EhcwjHKw==	2277c3cf9d6ff795c8f49f69398dfdbe79e67b1291a145e1be841e7fd0c0bc76	2002-11-05 00:00:00	SSfrENwVzvQI9JCg:lNZrQolcshFFaCG0/Bjv5w==:BWJfDJbYnixuwg==	m	ci	jKAoMwJhrgp8J8qR:HIuNEEtqHBaYn1YPxrMJSw==:MDTtYpTkUj4=	2040-01-31 00:00:00	biondoangelica2002@gmail.com	IWVg88TUc25C+k6s:kMcsVT9Ab1GEcUO1I2Ci8A==:Wur4	4CUpX/teQpjAV0O/:lh417uk20s/qvKmwbcDjGg==:QGD0	5CBgLwneNuEsC9cl:Su81CANJMgCezKYhUjlGYA==:LRK9	KJ00YY50Yg0quoAZ:rApaYr1owyab07qIyGlV6A==:Nj47	oYXMeKH5aijMdKVG:i4IaoJY/d0qzeXWyANhH5Q==:E94=	attivo	2026	contanti	t	f	f	\N	2026-09-24 16:56:55.064	2026-09-29 20:35:27.83	\N	\N	\N	MEMBER	\N
\.


--
-- Data for Name: NewsletterSubscriber; Type: TABLE DATA; Schema: public; Owner: robertalexandruneagu
--

COPY public."NewsletterSubscriber" (id, email, "createdAt") FROM stdin;
\.


--
-- Data for Name: OtpCode; Type: TABLE DATA; Schema: public; Owner: robertalexandruneagu
--

COPY public."OtpCode" (id, email, code, "expiresAt", "usedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: Product; Type: TABLE DATA; Schema: public; Owner: robertalexandruneagu
--

COPY public."Product" (id, title, description, category, author, price, "originalPrice", "isNew", images, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Project; Type: TABLE DATA; Schema: public; Owner: robertalexandruneagu
--

COPY public."Project" (id, title, description, category, status, images, cover, "createdAt", "updatedAt") FROM stdin;
ffccabfd-d445-4885-9f61-cc9c1eda09b8	proggetto utile	descrizione	sociale	ongoing	{https://d352fqmooqp9ew.cloudfront.net/projects/4ddbb31591bbaa8114e1.webp,https://d352fqmooqp9ew.cloudfront.net/projects/27ee7772308c04be2ce4.webp,https://d352fqmooqp9ew.cloudfront.net/projects/9ade42abc2d05940822a.webp}	https://d352fqmooqp9ew.cloudfront.net/projects/5034601c78286829a1ae.webp	2026-10-03 18:29:25.809	2026-10-03 18:29:25.809
\.


--
-- Data for Name: SiteSetting; Type: TABLE DATA; Schema: public; Owner: robertalexandruneagu
--

COPY public."SiteSetting" (key, value, "updatedAt") FROM stdin;
placeholder_page_hero	https://pub-7c471637e38d4bc2914d5ae9b118f8e7.r2.dev/placeholders/1b46dad1afc487122d1e.webp	2026-05-09 10:56:07.318
placeholder_member	https://pub-7c471637e38d4bc2914d5ae9b118f8e7.r2.dev/placeholders/bbf6f97b796591f314d0.webp	2026-05-09 10:56:17.428
placeholder_mosaic	https://pub-7c471637e38d4bc2914d5ae9b118f8e7.r2.dev/placeholders/caecc33eb71ec1d8275e.webp	2026-05-09 10:56:22.068
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: robertalexandruneagu
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
723dd648-c8f8-4a8c-9c12-ba368dcba556	8ffa925c010e31fe4ff9ceba5cede58bb91035e86a040c387a3a5d31eec90b3a	2026-05-09 12:21:42.33251+02	20260509102142_init	\N	\N	2026-05-09 12:21:42.315645+02	1
b3057d27-c31e-4b60-bc14-f0775f03c53c	4bec09673871ca2b6abec34a4f1342d274ef825f8d474f3e153a8412b139aa53	2026-05-09 12:41:19.732319+02	20260509104119_link_member_admin	\N	\N	2026-05-09 12:41:19.721529+02	1
d6ef96d1-e422-4161-8cbc-210533194b17	ed0599eb3eb85a590bb0fab79ebd059f7086a01d4849f966fd658d26778c55c3	2026-05-09 13:09:49.182237+02	20260509110949_add_profile_image	\N	\N	2026-05-09 13:09:49.180627+02	1
3015abd6-5a97-4ea1-bed7-02753ba0eb1f	1d171bc23b4a501c5c4481c4237f79f11b6adde56003536283f4e2065de4abf4	2026-05-09 13:33:02.253699+02	20260509113302_add_member_profile_image	\N	\N	2026-05-09 13:33:02.252261+02	1
02fff6da-406c-4807-997c-d026b9385f83	42fc17a918064a0c9af693ac8d9f3bf90adcc8b9dfbbc3f570f2d40b760834f8	2026-09-12 13:51:33.328277+02	20260912115133_unify_member_roles	\N	\N	2026-09-12 13:51:33.302968+02	1
3d62a22d-a840-485c-9f7b-540810764104	eb54fcb37ddb838da0703a70ec37d3356822e8212fdebaa176cdd1c91080c479	2026-09-12 14:40:38.864303+02	20260912124038_add_page_permissions	\N	\N	2026-09-12 14:40:38.862843+02	1
0f96a1ab-fac0-4a97-8411-de060ecdf367	06428f4832c5ef3d6a3871c26b214bd9a77db0454a191ffa6bd11f52120528c5	2026-09-25 15:48:52.691151+02	20260925134852_add_event_rsvp	\N	\N	2026-09-25 15:48:52.685911+02	1
bd994989-314a-443d-8028-9da7f64d9ec8	07f2b7410b0976bf5cbc7713fdcb35dab9633304bcc8d675ed8b34897b3ff90c	2026-09-26 13:51:00.902114+02	20260926115100_add_documents	\N	\N	2026-09-26 13:51:00.896894+02	1
d97b70bf-3ca6-45ae-a7b8-ddad99a9bcc2	9402996082c43f74e8266a3bbdb68e436dae8d21540998dc45d0277d403996c2	2026-09-26 16:05:49.019192+02	20260926140549_add_event_photo	\N	\N	2026-09-26 16:05:49.013314+02	1
66322bf7-ff25-4dc6-b1b0-1669b8080d80	707c4810a6eee3aeb5eed616961873b6ad71cc606c65d3f0564910897f477d84	2026-09-26 19:05:43.861401+02	20260926170543_add_uploader_fields_to_event_photo	\N	\N	2026-09-26 19:05:43.859057+02	1
87a0e9dc-7302-41f7-9d52-d7f7a80655bb	668987e4dbda79b7478574c162b18b8463891550ebeaa5de84d134431ff25da7	2026-09-28 18:55:53.009325+02	20260928165553_add_upload_token_to_event	\N	\N	2026-09-28 18:55:53.007132+02	1
583d7962-889d-4c02-b0e0-b55fa919e024	58e4594166f1f33166479665841684db90d76f3d0d6b9e272cff471c6882c517	2026-10-03 15:06:13.738851+02	20261003130613_add_booking_and_capacity	\N	\N	2026-10-03 15:06:13.734283+02	1
7ccb110c-739d-46c5-b93c-ecd7d7f3bc70	2d8ecdb76d5465c4ae39d4bf8ae579f2b0dd5f8f14bfa90cfa96ed24f62b126c	2026-10-03 16:22:56.810248+02	20261003142256_add_event_access_type	\N	\N	2026-10-03 16:22:56.808583+02	1
\.


--
-- Name: Article Article_pkey; Type: CONSTRAINT; Schema: public; Owner: robertalexandruneagu
--

ALTER TABLE ONLY public."Article"
    ADD CONSTRAINT "Article_pkey" PRIMARY KEY (id);


--
-- Name: Booking Booking_pkey; Type: CONSTRAINT; Schema: public; Owner: robertalexandruneagu
--

ALTER TABLE ONLY public."Booking"
    ADD CONSTRAINT "Booking_pkey" PRIMARY KEY (id);


--
-- Name: ContactMessage ContactMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: robertalexandruneagu
--

ALTER TABLE ONLY public."ContactMessage"
    ADD CONSTRAINT "ContactMessage_pkey" PRIMARY KEY (id);


--
-- Name: Document Document_pkey; Type: CONSTRAINT; Schema: public; Owner: robertalexandruneagu
--

ALTER TABLE ONLY public."Document"
    ADD CONSTRAINT "Document_pkey" PRIMARY KEY (id);


--
-- Name: Donation Donation_pkey; Type: CONSTRAINT; Schema: public; Owner: robertalexandruneagu
--

ALTER TABLE ONLY public."Donation"
    ADD CONSTRAINT "Donation_pkey" PRIMARY KEY (id);


--
-- Name: EventPhoto EventPhoto_pkey; Type: CONSTRAINT; Schema: public; Owner: robertalexandruneagu
--

ALTER TABLE ONLY public."EventPhoto"
    ADD CONSTRAINT "EventPhoto_pkey" PRIMARY KEY (id);


--
-- Name: EventRsvp EventRsvp_pkey; Type: CONSTRAINT; Schema: public; Owner: robertalexandruneagu
--

ALTER TABLE ONLY public."EventRsvp"
    ADD CONSTRAINT "EventRsvp_pkey" PRIMARY KEY (id);


--
-- Name: Event Event_pkey; Type: CONSTRAINT; Schema: public; Owner: robertalexandruneagu
--

ALTER TABLE ONLY public."Event"
    ADD CONSTRAINT "Event_pkey" PRIMARY KEY (id);


--
-- Name: Guardian Guardian_pkey; Type: CONSTRAINT; Schema: public; Owner: robertalexandruneagu
--

ALTER TABLE ONLY public."Guardian"
    ADD CONSTRAINT "Guardian_pkey" PRIMARY KEY (id);


--
-- Name: Member Member_pkey; Type: CONSTRAINT; Schema: public; Owner: robertalexandruneagu
--

ALTER TABLE ONLY public."Member"
    ADD CONSTRAINT "Member_pkey" PRIMARY KEY (id);


--
-- Name: NewsletterSubscriber NewsletterSubscriber_pkey; Type: CONSTRAINT; Schema: public; Owner: robertalexandruneagu
--

ALTER TABLE ONLY public."NewsletterSubscriber"
    ADD CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY (id);


--
-- Name: OtpCode OtpCode_pkey; Type: CONSTRAINT; Schema: public; Owner: robertalexandruneagu
--

ALTER TABLE ONLY public."OtpCode"
    ADD CONSTRAINT "OtpCode_pkey" PRIMARY KEY (id);


--
-- Name: Product Product_pkey; Type: CONSTRAINT; Schema: public; Owner: robertalexandruneagu
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY (id);


--
-- Name: Project Project_pkey; Type: CONSTRAINT; Schema: public; Owner: robertalexandruneagu
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_pkey" PRIMARY KEY (id);


--
-- Name: SiteSetting SiteSetting_pkey; Type: CONSTRAINT; Schema: public; Owner: robertalexandruneagu
--

ALTER TABLE ONLY public."SiteSetting"
    ADD CONSTRAINT "SiteSetting_pkey" PRIMARY KEY (key);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: robertalexandruneagu
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Booking_cancelToken_key; Type: INDEX; Schema: public; Owner: robertalexandruneagu
--

CREATE UNIQUE INDEX "Booking_cancelToken_key" ON public."Booking" USING btree ("cancelToken");


--
-- Name: EventRsvp_eventId_email_key; Type: INDEX; Schema: public; Owner: robertalexandruneagu
--

CREATE UNIQUE INDEX "EventRsvp_eventId_email_key" ON public."EventRsvp" USING btree ("eventId", email);


--
-- Name: Event_slug_key; Type: INDEX; Schema: public; Owner: robertalexandruneagu
--

CREATE UNIQUE INDEX "Event_slug_key" ON public."Event" USING btree (slug);


--
-- Name: Guardian_memberId_key; Type: INDEX; Schema: public; Owner: robertalexandruneagu
--

CREATE UNIQUE INDEX "Guardian_memberId_key" ON public."Guardian" USING btree ("memberId");


--
-- Name: Member_fiscalCodeHash_membershipYear_key; Type: INDEX; Schema: public; Owner: robertalexandruneagu
--

CREATE UNIQUE INDEX "Member_fiscalCodeHash_membershipYear_key" ON public."Member" USING btree ("fiscalCodeHash", "membershipYear");


--
-- Name: NewsletterSubscriber_email_key; Type: INDEX; Schema: public; Owner: robertalexandruneagu
--

CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON public."NewsletterSubscriber" USING btree (email);


--
-- Name: Booking Booking_eventId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: robertalexandruneagu
--

ALTER TABLE ONLY public."Booking"
    ADD CONSTRAINT "Booking_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES public."Event"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Donation Donation_memberId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: robertalexandruneagu
--

ALTER TABLE ONLY public."Donation"
    ADD CONSTRAINT "Donation_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES public."Member"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EventPhoto EventPhoto_eventId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: robertalexandruneagu
--

ALTER TABLE ONLY public."EventPhoto"
    ADD CONSTRAINT "EventPhoto_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES public."Event"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EventRsvp EventRsvp_eventId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: robertalexandruneagu
--

ALTER TABLE ONLY public."EventRsvp"
    ADD CONSTRAINT "EventRsvp_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES public."Event"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Guardian Guardian_memberId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: robertalexandruneagu
--

ALTER TABLE ONLY public."Guardian"
    ADD CONSTRAINT "Guardian_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES public."Member"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: robertalexandruneagu
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict Kob5k76DexBqRzmAeeCQXLf9fR6kljdod5MoNAFPR2UGIU5J5unAnScYcKg7ngD


UPDATE public.buildings
SET
  address = 'Passeig de Gràcia 43, Barcelona, Spania',
  short_description = 'O capodoperă a modernismului catalan, remodelată de Gaudí cu o fațadă din mozaic colorat și balcoane scheletice.',
  history = 'Casa Batlló este una dintre cele mai celebre lucrări ale lui Antoni Gaudí, o remodelare îndrăzneață finalizată între 1904 și 1906 pentru industriașul textilist Josep Batlló i Casanovas. Clădirea, construită inițial în 1877, a fost transformată de Gaudí într-o operă vie de artă modernistă catalană.

Fațada este acoperită cu un colaj strălucitor de fragmente de sticlă și ceramică colorată (trencadís), care se schimbă în lumina soarelui de la nuanțe de albastru și verde la auriu. Balcoanele în formă de mască și coloanele osoase i-au adus popular numele de „Casa Oaselor” (Casa dels Ossos).

Acoperișul, cu solzii săi ondulați, este interpretat pe scară largă ca spatele unui dragon — o referire la Sfântul Gheorghe (Sant Jordi), patronul Cataloniei, cu turnul crucii reprezentând sulița înfiptă în trupul creaturii.

În interior, Gaudí a evitat aproape complet liniile drepte. Puțul central de lumină, căptușit cu plăci ceramice care se estompează treptat de la albastru închis în vârf la alb la bază, distribuie uniform lumina naturală în toate etajele. Ferestrele își schimbă dimensiunea pe verticală pentru a echilibra iluminarea de la parter până la mansardă.

Astăzi, Casa Batlló este monument istoric al Spaniei, este inclusă în patrimoniul mondial UNESCO și rămâne unul dintre cele mai vizitate monumente din Barcelona.'
WHERE slug = 'casa-batllo';

UPDATE public.building_images
SET caption = CASE
  WHEN caption ILIKE '%facade%' OR caption ILIKE '%mosaic%' THEN 'Fațada din mozaic colorat trencadís'
  WHEN caption ILIKE '%roof%' OR caption ILIKE '%dragon%' THEN 'Acoperișul ondulat, asemănător spatelui unui dragon'
  WHEN caption ILIKE '%interior%' OR caption ILIKE '%light%' THEN 'Puțul central de lumină, căptușit cu plăci ceramice'
  ELSE caption
END
WHERE building_id = (SELECT id FROM public.buildings WHERE slug = 'casa-batllo');
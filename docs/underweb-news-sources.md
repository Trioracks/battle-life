# Источники исторических выпусков Искры

Архив — самостоятельные короткие русские пересказы фактов, а не копии статей или форумных сообщений. Он содержит 244 выпуска с шагом три игровых дня: первый — 01.09.2012, последний — 31.08.2014. На 01.09.2014 остаётся последний выпуск; следующая дата по сетке уже вне заданного периода. Даты вычисляются от игрового дня 1 и не зависят от часов компьютера.

`publishDate` — дата выпуска в игре. `eventDate` — дата события, объявления или публикации, о которой сообщает выпуск. Для фотографий APOD прямо указана публикация NASA: это не новая дата съёмки старого изображения. Для ретроспективных заметок дата события сохранена отдельно; задержка не превышает двух недель.

Исходный обзор выполнен по датированным хроникам Wikipedia за август 2012 — август 2014, официальным материалам NASA и публикациям производителей игр. В таблице используются отдельные страницы дат, а не поисковая выдача. Источники хроники — вторичные: их нельзя представлять как независимое подтверждение каждой детали первоисточником. Формулировки ограничены проверенным фактом; сообщения о научных гипотезах не превращены в доказанные открытия.

При перепроверке найдены и исправлены ошибки исходной выборки: метаданные `release_date` магазина Steam сами по себе не доказывают дату появления игры именно в Steam; запись об ETS2 от 12.10.2012 исключена. Награждение медалями Филдса уточнено на 13.08.2014 по IMU, объявление научного прорыва года — на 20.12.2012 по пресс-релизу AAAS. Современные названия переизданий не переносятся в старые новости.

Из 61 оставшейся игровой записи, первоначально выбранной по карточкам Steam, 59 переведены на объявления Valve, разработчиков и издателей либо официальную историю игры. У двух записей — The Typing of the Dead: Overkill и Metal Slug 3 — сохранены карточки конкретного ПК-издания; отдельный датированный материал Valve не найден. Для Metal Slug 3 дополнительно прочитан архив пресс-релизов SNK за февраль 2014 года. Карточки не трактуются как универсальная дата первого выпуска игры на всех платформах.

У сообщений Valve используется календарная дата публикации объявления в UTC, а не дата локального полуночного запуска магазина. Поэтому у Dark Souls, Dark Souls II и Tales of Maj’Eyal дата объявления может отличаться на один день от привычной региональной даты релиза. Текст прямо сообщает об объявлении Valve. Для других издателей сохранена объявленная ими дата выпуска. У Borderlands 2, Dishonored, Assassin’s Creed III, Far Cry 3, Remember Me и Splinter Cell Blacklist уточнён регион; у State of Decay, Insurgency, Divinity и Don’t Starve — полный релиз после предварительного доступа; у Broken Age и игр Telltale — конкретный акт или первый эпизод.

Все внешние источники открываются пользователем явно. Игра не обращается к ним для выбора выпуска. Прямой адрес локальной статьи, поиск и архив используют один барьер игровой даты; исходные данные не содержат новостей после 01.09.2014. Живые внешние страницы могут со временем меняться.

Исследовательские выгрузки и черновые инструменты находятся только в `D:/Codex/Temp/Battle-underweb-news-20261010`, вне поставляемого проекта. Здесь сохраняются оригинальные пересказы и ссылки. Необязательная команда `node tools/audit-underweb-news.mjs` проверяет доступность ссылок последовательно, прекращает работу при HTTP 429 и записывает только статусы в ту же папку на D:. Доступность URL сама по себе не доказывает содержание; факты читались отдельно.

Итоговая проверка: 244 выпуска, 234 разных URL, восемь категорий. Прямой последовательный HTTP-аудит подтвердил 233 адреса; соединение Node с доменом XSEED дважды завершилось тайм-аутом. Статья XSEED от 24.07.2014 отдельно открыта веб-инструментом: в ней подтверждён запуск Trails in the Sky в Steam и GOG 29.07.2014. Доступность этого адреса из локального скрипта не заявляется. Проверки модели, маршрутов и представлений — 13/13; полный `npm test` после правок — 627/627.

## Реестр выпусков

| Игровой выпуск | Дата события / сообщения | Заголовок | Источник |
| --- | --- | --- | --- |
| 2012-09-01 | 2012-08-23 | Dark Souls добралась до ПК | [Valve · датированное объявление Steam](https://store.steampowered.com/news/8564/) |
| 2012-09-04 | 2012-09-02 | Баттон выиграл в Спа | [Wikipedia · хроника 2012-09-02](https://en.wikipedia.org/wiki/Portal:Current_events/2012_September_2) |
| 2012-09-07 | 2012-09-07 | В Steam вышла To the Moon | [Valve · датированное объявление Steam](https://store.steampowered.com/news/8818/) |
| 2012-09-10 | 2012-09-10 | Первый US Open Энди Маррея | [Wikipedia · хроника 2012-09-10](https://en.wikipedia.org/wiki/Portal:Current_events/2012_September_10) |
| 2012-09-13 | 2012-09-12 | Apple показала iPhone 5 | [Wikipedia · хроника 2012-09-12](https://en.wikipedia.org/wiki/Portal:Current_events/2012_September_12) |
| 2012-09-16 | 2012-09-14 | В Steam вышла FTL: Faster Than Light | [Valve · датированное объявление Steam](https://store.steampowered.com/news/8863/) |
| 2012-09-19 | 2012-09-18 | В Steam вышла Borderlands 2 | [Valve · объявление о Borderlands 2](https://store.steampowered.com/news/8875/) |
| 2012-09-22 | 2012-09-22 | В Лувре открылся новый отдел | [Wikipedia · хроника 2012-09-22](https://en.wikipedia.org/wiki/Portal:Current_events/2012_September_22) |
| 2012-09-25 | 2012-09-25 | У Олимпиады в Сочи появился девиз | [Wikipedia · хроника 2012-09-25](https://en.wikipedia.org/wiki/Portal:Current_events/2012_September_25) |
| 2012-09-28 | 2012-09-27 | Curiosity нашёл следы древнего ручья | [Wikipedia · хроника 2012-09-27](https://en.wikipedia.org/wiki/Portal:Current_events/2012_September_27) |
| 2012-10-01 | 2012-09-30 | Ма Лун взял Кубок мира | [Wikipedia · хроника 2012-09-30](https://en.wikipedia.org/wiki/Portal:Current_events/2012_September_30) |
| 2012-10-04 | 2012-10-03 | Завершился полёт европейского ATV-3 | [Wikipedia · хроника 2012-10-03](https://en.wikipedia.org/wiki/Portal:Current_events/2012_October_3) |
| 2012-10-07 | 2012-10-07 | Корк выиграл ирландский финал | [Wikipedia · хроника 2012-10-07](https://en.wikipedia.org/wiki/Portal:Current_events/2012_October_7) |
| 2012-10-10 | 2012-10-09 | В Steam вышла XCOM: Enemy Unknown | [Valve · датированное объявление Steam](https://store.steampowered.com/news/9039/) |
| 2012-10-13 | 2012-10-10 | Нобелевская премия за работу с рецепторами | [Wikipedia · хроника 2012-10-10](https://en.wikipedia.org/wiki/Portal:Current_events/2012_October_10) |
| 2012-10-16 | 2012-10-09 | В Steam вышла Dishonored | [Valve · объявление о Dishonored](https://store.steampowered.com/news/9040/) |
| 2012-10-19 | 2012-10-17 | Сообщили о планете у Альфы Центавра | [Wikipedia · хроника 2012-10-17](https://en.wikipedia.org/wiki/Portal:Current_events/2012_October_17) |
| 2012-10-22 | 2012-10-14 | Прыжок Баумгартнера из стратосферы | [Wikipedia · хроника 2012-10-14](https://en.wikipedia.org/wiki/Portal:Current_events/2012_October_14) |
| 2012-10-25 | 2012-10-23 | В Steam вышла Hotline Miami | [Valve · датированное объявление Steam](https://store.steampowered.com/news/9169/) |
| 2012-10-28 | 2012-10-28 | Феттель победил в Индии | [Wikipedia · хроника 2012-10-28](https://en.wikipedia.org/wiki/Portal:Current_events/2012_October_28) |
| 2012-10-31 | 2012-10-30 | Disney объявила о покупке Lucasfilm | [Wikipedia · хроника 2012-10-30](https://en.wikipedia.org/wiki/Portal:Current_events/2012_October_30) |
| 2012-11-03 | 2012-11-01 | Gmail вышла вперёд по оценке ComScore | [Wikipedia · хроника 2012-11-01](https://en.wikipedia.org/wiki/Portal:Current_events/2012_November_1) |
| 2012-11-06 | 2012-11-04 | Райкконен выиграл в Абу-Даби | [Wikipedia · хроника 2012-11-04](https://en.wikipedia.org/wiki/Portal:Current_events/2012_November_4) |
| 2012-11-09 | 2012-11-09 | В Steam вышла Puddle | [Valve · датированное объявление Steam](https://store.steampowered.com/news/9329/) |
| 2012-11-12 | 2012-11-12 | Джокович выиграл итоговый турнир ATP | [Wikipedia · хроника 2012-11-12](https://en.wikipedia.org/wiki/Portal:Current_events/2012_November_12) |
| 2012-11-15 | 2012-11-13 | В Steam вышла Call of Duty: Black Ops II | [Valve · датированное объявление Steam](https://store.steampowered.com/news/9356/) |
| 2012-11-18 | 2012-11-18 | Бразилия — чемпион мира по футзалу | [Wikipedia · хроника 2012-11-18](https://en.wikipedia.org/wiki/Portal:Current_events/2012_November_18) |
| 2012-11-21 | 2012-11-20 | В Steam вышла Assassin’s Creed III | [Valve · объявление об Assassin’s Creed III](https://store.steampowered.com/news/9364/) |
| 2012-11-24 | 2012-11-20 | В Steam вышла Hitman: Absolution | [Valve · датированное объявление Steam](https://store.steampowered.com/news/9415/) |
| 2012-11-27 | 2012-11-27 | В Steam вышла Super Hexagon | [Valve · датированное объявление Steam](https://store.steampowered.com/news/9449/) |
| 2012-11-30 | 2012-11-30 | NASA уточнило новости о Curiosity | [Wikipedia · хроника 2012-11-30](https://en.wikipedia.org/wiki/Portal:Current_events/2012_November_30) |
| 2012-12-03 | 2012-12-03 | Curiosity исследует углеродные соединения | [Wikipedia · хроника 2012-12-03](https://en.wikipedia.org/wiki/Portal:Current_events/2012_December_3) |
| 2012-12-06 | 2012-11-29 | В Steam вышла Far Cry 3 | [Valve · объявление о Far Cry 3](https://store.steampowered.com/news/9467/) |
| 2012-12-09 | 2012-12-09 | Месси превысил годовой рекорд Мюллера | [Wikipedia · хроника 2012-12-09](https://en.wikipedia.org/wiki/Portal:Current_events/2012_December_9) |
| 2012-12-12 | 2012-12-12 | Вышел Hawaii: Part II | [Miracle Musical · официальный Bandcamp](https://mirakurumyujikaru.bandcamp.com/album/hawaii-part-ii) |
| 2012-12-15 | 2012-12-14 | Финал ЧМ-2018 назначили «Лужникам» | [Wikipedia · хроника 2012-12-14](https://en.wikipedia.org/wiki/Portal:Current_events/2012_December_14) |
| 2012-12-18 | 2012-12-17 | Зонды GRAIL завершили лунную миссию | [Wikipedia · хроника 2012-12-17](https://en.wikipedia.org/wiki/Portal:Current_events/2012_December_17) |
| 2012-12-21 | 2012-12-21 | «Союз ТМА-07М» прибыл на МКС | [Wikipedia · хроника 2012-12-21](https://en.wikipedia.org/wiki/Portal:Current_events/2012_December_21) |
| 2012-12-24 | 2012-12-24 | SpaceX показала полёт Grasshopper | [Wikipedia · хроника 2012-12-24](https://en.wikipedia.org/wiki/Portal:Current_events/2012_December_24) |
| 2012-12-27 | 2012-12-27 | Фото дня NASA: Curiosity у Rocknest | [NASA · Astronomy Picture of the Day](https://apod.nasa.gov/apod/ap121227.html) |
| 2012-12-30 | 2012-12-20 | Science выделил открытие бозона Хиггса | [Duke University · сообщение о решении Science](https://today.duke.edu/2012/12/newstiphiggs2012boy) |
| 2013-01-02 | 2013-01-01 | Карлсен установил рекорд рейтинга | [Wikipedia · хроника 2013-01-01](https://en.wikipedia.org/wiki/Portal:Current_events/2013_January_1) |
| 2013-01-05 | 2013-01-05 | Испания выиграла Кубок Хопмана | [Wikipedia · хроника 2013-01-05](https://en.wikipedia.org/wiki/Portal:Current_events/2013_January_5) |
| 2013-01-08 | 2013-01-07 | Месси получил «Золотой мяч» FIFA | [Wikipedia · хроника 2013-01-07](https://en.wikipedia.org/wiki/Portal:Current_events/2013_January_7) |
| 2013-01-11 | 2013-01-11 | Астрономы описали Huge-LQG | [Wikipedia · хроника 2013-01-11](https://en.wikipedia.org/wiki/Portal:Current_events/2013_January_11) |
| 2013-01-14 | 2013-01-13 | «Операция “Арго”» взяла «Золотой глобус» | [Wikipedia · хроника 2013-01-13](https://en.wikipedia.org/wiki/Portal:Current_events/2013_January_13) |
| 2013-01-17 | 2013-01-16 | Гвардиола возглавит «Баварию» | [Wikipedia · хроника 2013-01-16](https://en.wikipedia.org/wiki/Portal:Current_events/2013_January_16) |
| 2013-01-20 | 2013-01-20 | MRO добавил данные о воде на Марсе | [Wikipedia · хроника 2013-01-20](https://en.wikipedia.org/wiki/Portal:Current_events/2013_January_20) |
| 2013-01-23 | 2013-01-19 | Кальциевые жилы на Марсе | [Wikipedia · хроника 2013-01-19](https://en.wikipedia.org/wiki/Portal:Current_events/2013_January_19) |
| 2013-01-26 | 2013-01-25 | В Steam вышла DmC: Devil May Cry | [Valve · датированное объявление Steam](https://store.steampowered.com/news/9805/) |
| 2013-01-29 | 2013-01-28 | Петра Меде проведёт «Евровидение» | [Wikipedia · хроника 2013-01-28](https://en.wikipedia.org/wiki/Portal:Current_events/2013_January_28) |
| 2013-02-01 | 2013-01-31 | В Steam вышла Antichamber | [Valve · датированное объявление Steam](https://store.steampowered.com/news/9861/) |
| 2013-02-04 | 2013-02-04 | Fall Out Boy возвращаются | [Wikipedia · хроника 2013-02-04](https://en.wikipedia.org/wiki/Portal:Current_events/2013_February_4) |
| 2013-02-07 | 2013-02-03 | Baltimore Ravens выиграли Супербоул | [Wikipedia · хроника 2013-02-03](https://en.wikipedia.org/wiki/Portal:Current_events/2013_February_3) |
| 2013-02-10 | 2013-02-10 | We Are Young — песня года на «Грэмми» | [Wikipedia · хроника 2013-02-10](https://en.wikipedia.org/wiki/Portal:Current_events/2013_February_10) |
| 2013-02-13 | 2013-02-10 | Gotye и Kimbra получили «Грэмми» | [Wikipedia · хроника 2013-02-10](https://en.wikipedia.org/wiki/Portal:Current_events/2013_February_10) |
| 2013-02-16 | 2013-02-16 | «Поза ребёнка» победила в Берлине | [Wikipedia · хроника 2013-02-16](https://en.wikipedia.org/wiki/Portal:Current_events/2013_February_16) |
| 2013-02-19 | 2013-02-19 | «Порту» победил «Малагу» | [Wikipedia · хроника 2013-02-19](https://en.wikipedia.org/wiki/Portal:Current_events/2013_February_19) |
| 2013-02-22 | 2013-02-20 | Sony представила PlayStation 4 | [Wikipedia · хроника 2013-02-20](https://en.wikipedia.org/wiki/Portal:Current_events/2013_February_20) |
| 2013-02-25 | 2013-02-24 | «Оскар» за лучший фильм достался «Арго» | [Wikipedia · хроника 2013-02-24](https://en.wikipedia.org/wiki/Portal:Current_events/2013_February_24) |
| 2013-02-28 | 2013-02-28 | Спилберг возглавит жюри Канн | [Wikipedia · хроника 2013-02-28](https://en.wikipedia.org/wiki/Portal:Current_events/2013_February_28) |
| 2013-03-03 | 2013-03-03 | Dragon доставил груз на МКС | [Wikipedia · хроника 2013-03-03](https://en.wikipedia.org/wiki/Portal:Current_events/2013_March_3) |
| 2013-03-06 | 2013-03-05 | В Steam вышла Tomb Raider | [Valve · датированное объявление Steam](https://store.steampowered.com/news/10067/) |
| 2013-03-09 | 2013-03-09 | Под поверхностью Марса восстановили русла | [Wikipedia · хроника 2013-03-09](https://en.wikipedia.org/wiki/Portal:Current_events/2013_March_9) |
| 2013-03-12 | 2013-03-12 | Древний Марс мог быть пригоден для жизни | [Wikipedia · хроника 2013-03-12](https://en.wikipedia.org/wiki/Portal:Current_events/2013_March_12) |
| 2013-03-15 | 2013-03-14 | Новые данные поддержали открытие Хиггса | [Wikipedia · хроника 2013-03-14](https://en.wikipedia.org/wiki/Portal:Current_events/2013_March_14) |
| 2013-03-18 | 2013-03-17 | Надаль и Шарапова выиграли Индиан-Уэллс | [Wikipedia · хроника 2013-03-17](https://en.wikipedia.org/wiki/Portal:Current_events/2013_March_17) |
| 2013-03-21 | 2013-03-21 | Planck показал новую карту ранней Вселенной | [Wikipedia · хроника 2013-03-21](https://en.wikipedia.org/wiki/Portal:Current_events/2013_March_21) |
| 2013-03-24 | 2013-03-24 | Феттель выиграл Гран-при Малайзии | [Wikipedia · хроника 2013-03-24](https://en.wikipedia.org/wiki/Portal:Current_events/2013_March_24) |
| 2013-03-27 | 2013-03-26 | В Steam вышла BioShock Infinite | [Take-Two / 2K · объявление о BioShock Infinite](https://ir.take2games.com/static-files/ff67b4a5-fb69-4043-9711-6790b7cf9ee0) |
| 2013-03-30 | 2013-03-29 | «Союз» долетел до МКС за шесть часов | [Wikipedia · хроника 2013-03-29](https://en.wikipedia.org/wiki/Portal:Current_events/2013_March_29) |
| 2013-04-02 | 2013-04-02 | Первые четвертьфиналы Лиги чемпионов | [Wikipedia · хроника 2013-04-02](https://en.wikipedia.org/wiki/Portal:Current_events/2013_April_2) |
| 2013-04-05 | 2013-04-04 | В Steam вышла Evoland | [Valve · датированное объявление Steam](https://store.steampowered.com/news/10298/) |
| 2013-04-08 | 2013-04-06 | «Бавария» досрочно стала чемпионом | [Wikipedia · хроника 2013-04-06](https://en.wikipedia.org/wiki/Portal:Current_events/2013_April_6) |
| 2013-04-11 | 2013-04-09 | В Steam вышла Age of Empires II HD | [Valve · датированное объявление Steam](https://store.steampowered.com/news/10379/) |
| 2013-04-14 | 2013-04-14 | Алонсо победил в Китае | [Wikipedia · хроника 2013-04-14](https://en.wikipedia.org/wiki/Portal:Current_events/2013_April_14) |
| 2013-04-17 | 2013-04-04 | Hubble увидел далёкую сверхновую | [Wikipedia · хроника 2013-04-04](https://en.wikipedia.org/wiki/Portal:Current_events/2013_April_4) |
| 2013-04-20 | 2013-04-19 | В Steam вышла Surgeon Simulator 2013 | [Valve · датированное объявление Steam](https://store.steampowered.com/news/10425/) |
| 2013-04-23 | 2013-04-23 | Полный релиз Don’t Starve | [Valve · датированное объявление Steam](https://store.steampowered.com/news/10448/) |
| 2013-04-26 | 2013-04-24 | Четыре гола Левандовского «Реалу» | [Wikipedia · хроника 2013-04-24](https://en.wikipedia.org/wiki/Portal:Current_events/2013_April_24) |
| 2013-04-29 | 2013-04-23 | «Бавария» обыграла «Барселону» 4:0 | [Wikipedia · хроника 2013-04-23](https://en.wikipedia.org/wiki/Portal:Current_events/2013_April_23) |
| 2013-05-02 | 2013-05-01 | В Steam вышла FEZ | [Valve · датированное объявление Steam](https://store.steampowered.com/news/10518/) |
| 2013-05-05 | 2013-05-01 | В Steam вышла Far Cry 3 - Blood Dragon | [Valve · датированное объявление Steam](https://store.steampowered.com/news/10502/) |
| 2013-05-08 | 2013-05-07 | Microsoft готовит изменения Windows 8 | [Wikipedia · хроника 2013-05-07](https://en.wikipedia.org/wiki/Portal:Current_events/2013_May_7) |
| 2013-05-11 | 2013-05-10 | На МКС готовят внеплановый выход | [Wikipedia · хроника 2013-05-10](https://en.wikipedia.org/wiki/Portal:Current_events/2013_May_10) |
| 2013-05-14 | 2013-05-14 | Хэдфилд, Маршберн и Романенко вернулись | [Wikipedia · хроника 2013-05-14](https://en.wikipedia.org/wiki/Portal:Current_events/2013_May_14) |
| 2013-05-17 | 2013-05-15 | Канны открылись «Великим Гэтсби» | [Wikipedia · хроника 2013-05-15](https://en.wikipedia.org/wiki/Portal:Current_events/2013_May_15) |
| 2013-05-20 | 2013-05-19 | Восемь наград Тейлор Свифт | [Wikipedia · хроника 2013-05-19](https://en.wikipedia.org/wiki/Portal:Current_events/2013_May_19) |
| 2013-05-23 | 2013-05-21 | Microsoft показала Xbox One | [Wikipedia · хроника 2013-05-21](https://en.wikipedia.org/wiki/Portal:Current_events/2013_May_21) |
| 2013-05-26 | 2013-05-26 | Главный приз Канн — у «Жизни Адель» | [Wikipedia · хроника 2013-05-26](https://en.wikipedia.org/wiki/Portal:Current_events/2013_May_26) |
| 2013-05-29 | 2013-05-25 | «Бавария» выиграла Лигу чемпионов | [Wikipedia · хроника 2013-05-25](https://en.wikipedia.org/wiki/Portal:Current_events/2013_May_25) |
| 2013-06-01 | 2013-06-01 | «Бавария» собрала три главных трофея | [Wikipedia · хроника 2013-06-01](https://en.wikipedia.org/wiki/Portal:Current_events/2013_June_1) |
| 2013-06-04 | 2013-06-04 | В Steam вышла Remember Me | [Capcom · объявление о выпуске](https://news.capcomusa.com/lets/browse/remember-me-is-available-now-for-ps3-xbox-360-and-pc) |
| 2013-06-07 | 2013-06-04 | Япония получила путёвку на ЧМ-2014 | [Wikipedia · хроника 2013-06-04](https://en.wikipedia.org/wiki/Portal:Current_events/2013_June_4) |
| 2013-06-10 | 2013-06-09 | Kinky Boots лидирует на Tony Awards | [Wikipedia · хроника 2013-06-09](https://en.wikipedia.org/wiki/Portal:Current_events/2013_June_9) |
| 2013-06-13 | 2013-06-09 | Восьмой «Ролан Гаррос» Надаля | [Wikipedia · хроника 2013-06-09](https://en.wikipedia.org/wiki/Portal:Current_events/2013_June_9) |
| 2013-06-16 | 2013-06-16 | «Человек из стали» мощно стартовал | [Wikipedia · хроника 2013-06-16](https://en.wikipedia.org/wiki/Portal:Current_events/2013_June_16) |
| 2013-06-19 | 2013-06-19 | Microsoft меняет условия Xbox One | [Wikipedia · хроника 2013-06-19](https://en.wikipedia.org/wiki/Portal:Current_events/2013_June_19) |
| 2013-06-22 | 2013-06-18 | Ещё три сборные вышли на чемпионат мира | [Wikipedia · хроника 2013-06-18](https://en.wikipedia.org/wiki/Portal:Current_events/2013_June_18) |
| 2013-06-25 | 2013-06-25 | «Шэньчжоу-10» вернулся на Землю | [Wikipedia · хроника 2013-06-25](https://en.wikipedia.org/wiki/Portal:Current_events/2013_June_25) |
| 2013-06-28 | 2013-06-27 | В Steam вышла Rogue Legacy | [Valve · датированное объявление Steam](https://store.steampowered.com/news/10958/) |
| 2013-07-01 | 2013-06-29 | Стартовал сотый «Тур де Франс» | [Wikipedia · хроника 2013-06-29](https://en.wikipedia.org/wiki/Portal:Current_events/2013_June_29) |
| 2013-07-04 | 2013-07-03 | В Steam вышла Bleed | [Valve · датированное объявление Steam](https://store.steampowered.com/news/11018/) |
| 2013-07-07 | 2013-07-07 | Маррей выиграл Уимблдон | [Wikipedia · хроника 2013-07-07](https://en.wikipedia.org/wiki/Portal:Current_events/2013_July_7) |
| 2013-07-10 | 2013-07-10 | New Horizons различил Плутон и Харон | [Wikipedia · хроника 2013-07-10](https://en.wikipedia.org/wiki/Portal:Current_events/2013_July_10) |
| 2013-07-13 | 2013-07-08 | Curiosity направляется к горе Шарп | [Wikipedia · хроника 2013-07-08](https://en.wikipedia.org/wiki/Portal:Current_events/2013_July_8) |
| 2013-07-16 | 2013-07-16 | Неисправность скафандра на МКС | [Wikipedia · хроника 2013-07-16](https://en.wikipedia.org/wiki/Portal:Current_events/2013_July_16) |
| 2013-07-19 | 2013-07-19 | NASA предложило сфотографировать Сатурн | [NASA · Astronomy Picture of the Day](https://apod.nasa.gov/apod/ap130719.html) |
| 2013-07-22 | 2013-07-21 | Крис Фрум выиграл «Тур де Франс» | [Wikipedia · хроника 2013-07-21](https://en.wikipedia.org/wiki/Portal:Current_events/2013_July_21) |
| 2013-07-25 | 2013-07-25 | Фото дня NASA: Тройная туманность | [NASA · Astronomy Picture of the Day](https://apod.nasa.gov/apod/ap130725.html) |
| 2013-07-28 | 2013-07-26 | Лондон отмечает год после Олимпиады | [Wikipedia · хроника 2013-07-26](https://en.wikipedia.org/wiki/Portal:Current_events/2013_July_26) |
| 2013-07-31 | 2013-07-31 | NASA показало 130 лет температур | [NASA · Astronomy Picture of the Day](https://apod.nasa.gov/apod/ap130731.html) |
| 2013-08-03 | 2013-08-02 | На Мадагаскаре описан новый лемур | [Wikipedia · хроника 2013-08-02](https://en.wikipedia.org/wiki/Portal:Current_events/2013_August_2) |
| 2013-08-06 | 2013-08-05 | В Лондоне попробовали выращенный бургер | [Wikipedia · хроника 2013-08-05](https://en.wikipedia.org/wiki/Portal:Current_events/2013_August_5) |
| 2013-08-09 | 2013-08-08 | В Steam вышла Papers, Please | [Valve · датированное объявление Steam](https://store.steampowered.com/news/11246/) |
| 2013-08-12 | 2013-08-08 | В Steam вышла Spelunky | [Mossmouth · история Spelunky](https://www.mossmouth.com/spelunky2/) |
| 2013-08-15 | 2013-08-15 | В Steam вышла Gone Home | [Valve · датированное объявление Steam](https://store.steampowered.com/news/11274/) |
| 2013-08-18 | 2013-08-15 | В Steam вышла Worms Clan Wars | [Valve · датированное объявление Steam](https://store.steampowered.com/news/11269/) |
| 2013-08-21 | 2013-08-20 | В Steam вышла Tom Clancy’s Splinter Cell Blacklist | [Ubisoft · Splinter Cell Blacklist](https://www.ubisoft.com/en-ca/games/tom-clancys-splinter-cell-blacklist) |
| 2013-08-24 | 2013-08-13 | В Steam вышла Europa Universalis IV | [Valve · датированное объявление Steam](https://store.steampowered.com/news/11250/) |
| 2013-08-27 | 2013-08-13 | В Steam вышла PAYDAY 2 | [Valve · датированное объявление Steam](https://store.steampowered.com/news/11249/) |
| 2013-08-30 | 2013-08-29 | В Steam вышла Game Dev Tycoon | [Valve · датированное объявление Steam](https://store.steampowered.com/news/11353/) |
| 2013-09-02 | 2013-08-22 | В Steam вышла Skullgirls | [Valve · датированное объявление Steam](https://store.steampowered.com/news/11313/) |
| 2013-09-05 | 2013-09-04 | В Steam вышла Outlast | [Valve · датированное объявление Steam](https://store.steampowered.com/news/11392/) |
| 2013-09-08 | 2013-09-07 | Токио выбран столицей Олимпиады-2020 | [Wikipedia · хроника 2013-09-07](https://en.wikipedia.org/wiki/Portal:Current_events/2013_September_7) |
| 2013-09-11 | 2013-09-10 | В Steam вышла Amnesia: A Machine for Pigs | [Valve · датированное объявление Steam](https://store.steampowered.com/news/11422/) |
| 2013-09-14 | 2013-09-10 | Apple представила iPhone 5s и 5c | [Wikipedia · хроника 2013-09-10](https://en.wikipedia.org/wiki/Portal:Current_events/2013_September_10) |
| 2013-09-17 | 2013-09-17 | Вышла Grand Theft Auto V | [Wikipedia · хроника 2013-09-17](https://en.wikipedia.org/wiki/Portal:Current_events/2013_September_17) |
| 2013-09-20 | 2013-09-20 | GTA V достигла миллиарда долларов | [Wikipedia · хроника 2013-09-20](https://en.wikipedia.org/wiki/Portal:Current_events/2013_September_20) |
| 2013-09-23 | 2013-09-22 | «Во все тяжкие» победил на «Эмми» | [Wikipedia · хроника 2013-09-22](https://en.wikipedia.org/wiki/Portal:Current_events/2013_September_22) |
| 2013-09-26 | 2013-09-26 | В Steam вышла Shadow Warrior | [Valve · датированное объявление Steam](https://store.steampowered.com/news/11528/) |
| 2013-09-29 | 2013-09-29 | Вышел финал «Во все тяжкие» | [Wikipedia · хроника 2013-09-29](https://en.wikipedia.org/wiki/Portal:Current_events/2013_September_29) |
| 2013-10-02 | 2013-10-01 | Открылась GTA Online | [Wikipedia · хроника 2013-10-01](https://en.wikipedia.org/wiki/Portal:Current_events/2013_October_1) |
| 2013-10-05 | 2013-10-01 | Стартовала NBA 2K14 | [Wikipedia · хроника 2013-10-01](https://en.wikipedia.org/wiki/Portal:Current_events/2013_October_1) |
| 2013-10-08 | 2013-10-08 | Нобелевская премия Хиггсу и Энглеру | [Wikipedia · хроника 2013-10-08](https://en.wikipedia.org/wiki/Portal:Current_events/2013_October_8) |
| 2013-10-11 | 2013-10-11 | Первый эпизод The Wolf Among Us | [Valve · датированное объявление Steam](https://store.steampowered.com/news/11610/) |
| 2013-10-14 | 2013-10-13 | Джокович снова победил в Шанхае | [Wikipedia · хроника 2013-10-13](https://en.wikipedia.org/wiki/Portal:Current_events/2013_October_13) |
| 2013-10-17 | 2013-10-10 | Элис Манро получила Нобелевскую премию | [Wikipedia · хроника 2013-10-10](https://en.wikipedia.org/wiki/Portal:Current_events/2013_October_10) |
| 2013-10-20 | 2013-10-20 | Фото дня NASA: три галактики и комета | [NASA · Astronomy Picture of the Day](https://apod.nasa.gov/apod/ap131020.html) |
| 2013-10-23 | 2013-10-22 | Apple показала iPad Air | [Wikipedia · хроника 2013-10-22](https://en.wikipedia.org/wiki/Portal:Current_events/2013_October_22) |
| 2013-10-26 | 2013-10-25 | В Steam вышла Batman: Arkham Origins | [Valve · датированное объявление Steam](https://store.steampowered.com/news/11689/) |
| 2013-10-29 | 2013-10-29 | В Steam вышла The Typing of The Dead: Overkill | [Steam · карточка ПК-издания](https://store.steampowered.com/app/246580/) |
| 2013-11-01 | 2013-10-24 | В Steam вышла ENSLAVED: Odyssey to the West Premium Edition | [Valve · датированное объявление Steam](https://store.steampowered.com/news/11706/) |
| 2013-11-04 | 2013-11-04 | Фото дня NASA: затмение над Нью-Йорком | [NASA · Astronomy Picture of the Day](https://apod.nasa.gov/apod/ap131104.html) |
| 2013-11-07 | 2013-11-05 | State of Decay вышла из раннего доступа | [Valve · датированное объявление Steam](https://store.steampowered.com/news/11786/) |
| 2013-11-10 | 2013-11-10 | «Аль-Ахли» снова взял африканский кубок | [Wikipedia · хроника 2013-11-10](https://en.wikipedia.org/wiki/Portal:Current_events/2013_November_10) |
| 2013-11-13 | 2013-11-12 | В Steam вышла Injustice: Gods Among Us Ultimate Edition | [Warner Bros. · объявление в Steam](https://steamcommunity.com/games/242700/announcements/detail/1928959864664812926) |
| 2013-11-16 | 2013-11-09 | «Гуанчжоу» победил в Лиге чемпионов Азии | [Wikipedia · хроника 2013-11-09](https://en.wikipedia.org/wiki/Portal:Current_events/2013_November_9) |
| 2013-11-19 | 2013-11-18 | MAVEN отправился к Марсу | [Wikipedia · хроника 2013-11-18](https://en.wikipedia.org/wiki/Portal:Current_events/2013_November_18) |
| 2013-11-22 | 2013-11-17 | Миллион PS4 за первые сутки | [Wikipedia · хроника 2013-11-17](https://en.wikipedia.org/wiki/Portal:Current_events/2013_November_17) |
| 2013-11-25 | 2013-11-23 | One Direction провели 1D Day | [Wikipedia · хроника 2013-11-23](https://en.wikipedia.org/wiki/Portal:Current_events/2013_November_23) |
| 2013-11-28 | 2013-11-26 | Музыканты выпустили благотворительный сборник | [Wikipedia · хроника 2013-11-26](https://en.wikipedia.org/wiki/Portal:Current_events/2013_November_26) |
| 2013-12-01 | 2013-12-01 | Комета ISON распалась у Солнца | [Wikipedia · хроника 2013-12-01](https://en.wikipedia.org/wiki/Portal:Current_events/2013_December_1) |
| 2013-12-04 | 2013-12-04 | Фото дня NASA: Лавджой среди руин | [NASA · Astronomy Picture of the Day](https://apod.nasa.gov/apod/ap131204.html) |
| 2013-12-07 | 2013-12-06 | «Чанъэ-3» вышел на лунную орбиту | [Wikipedia · хроника 2013-12-06](https://en.wikipedia.org/wiki/Portal:Current_events/2013_December_6) |
| 2013-12-10 | 2013-12-06 | Прошла жеребьёвка ЧМ-2014 | [Wikipedia · хроника 2013-12-06](https://en.wikipedia.org/wiki/Portal:Current_events/2013_December_6) |
| 2013-12-13 | 2013-12-13 | В Steam вышла Tales of Maj'Eyal | [Valve · датированное объявление Steam](https://store.steampowered.com/news/12083/) |
| 2013-12-16 | 2013-12-13 | Бейонсе выпустила альбом без анонса | [Wikipedia · хроника 2013-12-13](https://en.wikipedia.org/wiki/Portal:Current_events/2013_December_13) |
| 2013-12-19 | 2013-12-17 | Начался второй сезон The Walking Dead | [Valve · датированное объявление Steam](https://store.steampowered.com/news/12121/) |
| 2013-12-22 | 2013-12-22 | Фото дня NASA: солнечная восьмёрка | [NASA · Astronomy Picture of the Day](https://apod.nasa.gov/apod/ap131222.html) |
| 2013-12-25 | 2013-12-25 | NASA показало виртуальное вращение Фобоса | [NASA · Astronomy Picture of the Day](https://apod.nasa.gov/apod/ap131225.html) |
| 2013-12-28 | 2013-12-28 | Первый запуск «Союза-2.1в» | [Wikipedia · хроника 2013-12-28](https://en.wikipedia.org/wiki/Portal:Current_events/2013_December_28) |
| 2013-12-31 | 2013-12-31 | Фото дня NASA: Конская Голова | [NASA · Astronomy Picture of the Day](https://apod.nasa.gov/apod/ap131231.html) |
| 2014-01-03 | 2014-01-03 | Фото дня NASA: Лавджой в новом году | [NASA · Astronomy Picture of the Day](https://apod.nasa.gov/apod/ap140103.html) |
| 2014-01-06 | 2014-01-05 | Индия испытала криогенный двигатель | [Wikipedia · хроника 2014-01-05](https://en.wikipedia.org/wiki/Portal:Current_events/2014_January_5) |
| 2014-01-09 | 2014-01-09 | В Steam вышла METAL GEAR RISING: REVENGEANCE | [Valve · датированное объявление Steam](https://store.steampowered.com/news/12193/) |
| 2014-01-12 | 2014-01-09 | OutKast объявили о воссоединении | [Wikipedia · хроника 2014-01-09](https://en.wikipedia.org/wiki/Portal:Current_events/2014_January_9) |
| 2014-01-15 | 2014-01-12 | «Золотой глобус» назвал лучшие фильмы | [Wikipedia · хроника 2014-01-12](https://en.wikipedia.org/wiki/Portal:Current_events/2014_January_12) |
| 2014-01-18 | 2014-01-18 | Гильдия актёров наградила Макконахи и Бланшетт | [Wikipedia · хроника 2014-01-18](https://en.wikipedia.org/wiki/Portal:Current_events/2014_January_18) |
| 2014-01-21 | 2014-01-20 | «Розетта» проснулась | [Wikipedia · хроника 2014-01-20](https://en.wikipedia.org/wiki/Portal:Current_events/2014_January_20) |
| 2014-01-24 | 2014-01-22 | Полная версия Insurgency уже доступна | [Valve · датированное объявление Steam](https://store.steampowered.com/news/12255/) |
| 2014-01-27 | 2014-01-26 | Daft Punk собрали главные «Грэмми» | [Wikipedia · хроника 2014-01-26](https://en.wikipedia.org/wiki/Portal:Current_events/2014_January_26) |
| 2014-01-30 | 2014-01-28 | Вышел первый акт Broken Age | [Valve · датированное объявление Steam](https://store.steampowered.com/news/12290/) |
| 2014-02-02 | 2014-02-02 | Бруно Марс выступил на Супербоуле | [Wikipedia · хроника 2014-02-02](https://en.wikipedia.org/wiki/Portal:Current_events/2014_February_2) |
| 2014-02-05 | 2014-02-04 | Сатья Наделла возглавил Microsoft | [Wikipedia · хроника 2014-02-04](https://en.wikipedia.org/wiki/Portal:Current_events/2014_February_4) |
| 2014-02-08 | 2014-02-08 | Двенадцатая олимпийская медаль Бьорндалена | [Wikipedia · хроника 2014-02-08](https://en.wikipedia.org/wiki/Portal:Current_events/2014_February_8) |
| 2014-02-11 | 2014-02-11 | Фото дня NASA: Сердце и Душа | [NASA · Astronomy Picture of the Day](https://apod.nasa.gov/apod/ap140211.html) |
| 2014-02-14 | 2014-02-14 | В Steam вышла METAL SLUG 3 | [SNK / Steam · компьютерное издание](https://store.steampowered.com/app/250180/) |
| 2014-02-17 | 2014-02-17 | Дэвис и Уайт выиграли танцы на льду | [Wikipedia · хроника 2014-02-17](https://en.wikipedia.org/wiki/Portal:Current_events/2014_February_17) |
| 2014-02-20 | 2014-02-19 | Боуи и Arctic Monkeys отмечены на BRIT | [Wikipedia · хроника 2014-02-19](https://en.wikipedia.org/wiki/Portal:Current_events/2014_February_19) |
| 2014-02-23 | 2014-02-23 | Олимпиада в Сочи завершилась | [Wikipedia · хроника 2014-02-23](https://en.wikipedia.org/wiki/Portal:Current_events/2014_February_23) |
| 2014-02-26 | 2014-02-24 | Nokia представила смартфон на Android | [Wikipedia · хроника 2014-02-24](https://en.wikipedia.org/wiki/Portal:Current_events/2014_February_24) |
| 2014-03-01 | 2014-02-28 | В Steam вышла Resident Evil 4 Ultimate HD Edition | [Valve · датированное объявление Steam](https://store.steampowered.com/news/12534/) |
| 2014-03-04 | 2014-03-03 | «12 лет рабства» получил главный «Оскар» | [Wikipedia · хроника 2014-03-03](https://en.wikipedia.org/wiki/Portal:Current_events/2014_March_3) |
| 2014-03-07 | 2014-03-03 | Семь «Оскаров» у «Гравитации» | [Wikipedia · хроника 2014-03-03](https://en.wikipedia.org/wiki/Portal:Current_events/2014_March_3) |
| 2014-03-10 | 2014-03-03 | «Холодное сердце» взяло два «Оскара» | [Wikipedia · хроника 2014-03-03](https://en.wikipedia.org/wiki/Portal:Current_events/2014_March_3) |
| 2014-03-13 | 2014-03-13 | Фото дня NASA: галактика Подсолнух | [NASA · Astronomy Picture of the Day](https://apod.nasa.gov/apod/ap140313.html) |
| 2014-03-16 | 2014-03-16 | Закрылись Паралимпийские игры | [Wikipedia · хроника 2014-03-16](https://en.wikipedia.org/wiki/Portal:Current_events/2014_March_16) |
| 2014-03-19 | 2014-03-17 | В Steam вышла LYNE | [Valve · датированное объявление Steam](https://store.steampowered.com/news/12655/) |
| 2014-03-22 | 2014-03-22 | Сезон MLB открылся в Сиднее | [Wikipedia · хроника 2014-03-22](https://en.wikipedia.org/wiki/Portal:Current_events/2014_March_22) |
| 2014-03-25 | 2014-03-25 | Фото дня NASA: пыль вокруг Ориона | [NASA · Astronomy Picture of the Day](https://apod.nasa.gov/apod/ap140325.html) |
| 2014-03-28 | 2014-03-27 | В Steam вышла Creeper World 3: Arc Eternal | [Knuckle Cracker · объявление в Steam](https://steamcommunity.com/games/cw3/announcements/detail/1715049829191387506) |
| 2014-03-31 | 2014-03-26 | Laureus отметил Феттеля и «Баварию» | [Wikipedia · хроника 2014-03-26](https://en.wikipedia.org/wiki/Portal:Current_events/2014_March_26) |
| 2014-04-03 | 2014-04-01 | В Steam вышла Goat Simulator | [Valve · датированное объявление Steam](https://store.steampowered.com/news/12800/) |
| 2014-04-06 | 2014-04-06 | Эллен ван Дейк выиграла Тур Фландрии | [Wikipedia · хроника 2014-04-06](https://en.wikipedia.org/wiki/Portal:Current_events/2014_April_6) |
| 2014-04-09 | 2014-04-08 | Закончилась поддержка Windows XP | [Wikipedia · хроника 2014-04-08](https://en.wikipedia.org/wiki/Portal:Current_events/2014_April_8) |
| 2014-04-12 | 2014-04-03 | Под Энцеладом предполагают океан | [Wikipedia · хроника 2014-04-03](https://en.wikipedia.org/wiki/Portal:Current_events/2014_April_3) |
| 2014-04-15 | 2014-04-15 | Произошло полное лунное затмение | [Wikipedia · хроника 2014-04-15](https://en.wikipedia.org/wiki/Portal:Current_events/2014_April_15) |
| 2014-04-18 | 2014-04-18 | Фото дня NASA: красная Луна и лазер | [NASA · Astronomy Picture of the Day](https://apod.nasa.gov/apod/ap140418.html) |
| 2014-04-21 | 2014-04-20 | Хэмилтон взял третью победу подряд | [Wikipedia · хроника 2014-04-20](https://en.wikipedia.org/wiki/Portal:Current_events/2014_April_20) |
| 2014-04-24 | 2014-04-21 | Кефлезиги выиграл Бостонский марафон | [Wikipedia · хроника 2014-04-21](https://en.wikipedia.org/wiki/Portal:Current_events/2014_April_21) |
| 2014-04-27 | 2014-04-24 | В Steam вышла DARK SOULS II | [Valve · датированное объявление Steam](https://store.steampowered.com/news/13149/) |
| 2014-04-30 | 2014-04-30 | Фото дня NASA: затмение на закате | [NASA · Astronomy Picture of the Day](https://apod.nasa.gov/apod/ap140430.html) |
| 2014-05-03 | 2014-05-03 | «Корабль Тесея» получил национальную премию | [Wikipedia · хроника 2014-05-03](https://en.wikipedia.org/wiki/Portal:Current_events/2014_May_3) |
| 2014-05-06 | 2014-05-03 | California Chrome выиграл Кентукки-дерби | [Wikipedia · хроника 2014-05-03](https://en.wikipedia.org/wiki/Portal:Current_events/2014_May_3) |
| 2014-05-09 | 2014-05-07 | Учёные представили «Пиноккио-рекса» | [Wikipedia · хроника 2014-05-07](https://en.wikipedia.org/wiki/Portal:Current_events/2014_May_7) |
| 2014-05-12 | 2014-05-10 | Кончита Вурст победила на «Евровидении» | [Wikipedia · хроника 2014-05-10](https://en.wikipedia.org/wiki/Portal:Current_events/2014_May_10) |
| 2014-05-15 | 2014-05-15 | В Steam вышла BattleBlock Theater | [Valve · датированное объявление Steam](https://store.steampowered.com/news/13335/) |
| 2014-05-18 | 2014-05-17 | Кубок Германии достался «Баварии» | [Wikipedia · хроника 2014-05-17](https://en.wikipedia.org/wiki/Portal:Current_events/2014_May_17) |
| 2014-05-21 | 2014-05-20 | В Steam вышла Transistor | [Supergiant Games · Transistor Now Available](https://www.supergiantgames.com/blog/transistor-now-available/) |
| 2014-05-24 | 2014-05-24 | «Зимняя спячка» победила в Каннах | [Wikipedia · хроника 2014-05-24](https://en.wikipedia.org/wiki/Portal:Current_events/2014_May_24) |
| 2014-05-27 | 2014-05-27 | В Steam вышла Watch_Dogs | [Valve · датированное объявление Steam](https://store.steampowered.com/news/13443/) |
| 2014-05-30 | 2014-05-28 | Apple объявила о покупке Beats | [Wikipedia · хроника 2014-05-28](https://en.wikipedia.org/wiki/Portal:Current_events/2014_May_28) |
| 2014-06-02 | 2014-05-24 | «Реал» выиграл мадридский финал | [Wikipedia · хроника 2014-05-24](https://en.wikipedia.org/wiki/Portal:Current_events/2014_May_24) |
| 2014-06-05 | 2014-06-04 | Эймар Макбрайд получила литературную премию | [Wikipedia · хроника 2014-06-04](https://en.wikipedia.org/wiki/Portal:Current_events/2014_June_4) |
| 2014-06-08 | 2014-06-08 | All the Way получил премию Tony | [Wikipedia · хроника 2014-06-08](https://en.wikipedia.org/wiki/Portal:Current_events/2014_June_8) |
| 2014-06-11 | 2014-06-08 | Девятый титул Надаля в Париже | [Wikipedia · хроника 2014-06-08](https://en.wikipedia.org/wiki/Portal:Current_events/2014_June_8) |
| 2014-06-14 | 2014-06-12 | Начался чемпионат мира в Бразилии | [Wikipedia · хроника 2014-06-12](https://en.wikipedia.org/wiki/Portal:Current_events/2014_June_12) |
| 2014-06-17 | 2014-06-17 | NASA показало световое эхо V838 | [NASA · Astronomy Picture of the Day](https://apod.nasa.gov/apod/ap140617.html) |
| 2014-06-20 | 2014-06-20 | Дэвид Блатт переходит в NBA | [Wikipedia · хроника 2014-06-20](https://en.wikipedia.org/wiki/Portal:Current_events/2014_June_20) |
| 2014-06-23 | 2014-06-23 | Природные объекты Дании пополнили список ЮНЕСКО | [Wikipedia · хроника 2014-06-23](https://en.wikipedia.org/wiki/Portal:Current_events/2014_June_23) |
| 2014-06-26 | 2014-06-26 | В Steam вышла Shovel Knight | [Valve · датированное объявление Steam](https://store.steampowered.com/news/13727/) |
| 2014-06-29 | 2014-06-29 | Фото дня NASA: Млечный Путь над бухтой | [NASA · Astronomy Picture of the Day](https://apod.nasa.gov/apod/ap140629.html) |
| 2014-07-02 | 2014-06-30 | Состоялся полный релиз Divinity: Original Sin | [Valve · датированное объявление Steam](https://store.steampowered.com/news/13736/) |
| 2014-07-05 | 2014-07-05 | Фото дня NASA: M106 в разных диапазонах | [NASA · Astronomy Picture of the Day](https://apod.nasa.gov/apod/ap140705.html) |
| 2014-07-08 | 2014-07-08 | Германия победила Бразилию 7:1 | [Wikipedia · хроника 2014-07-08](https://en.wikipedia.org/wiki/Portal:Current_events/2014_July_8) |
| 2014-07-11 | 2014-07-09 | Аргентина прошла в финал по пенальти | [Wikipedia · хроника 2014-07-09](https://en.wikipedia.org/wiki/Portal:Current_events/2014_July_9) |
| 2014-07-14 | 2014-07-13 | Германия стала чемпионом мира | [Wikipedia · хроника 2014-07-13](https://en.wikipedia.org/wiki/Portal:Current_events/2014_July_13) |
| 2014-07-17 | 2014-07-08 | Клозе установил рекорд чемпионатов мира | [Wikipedia · хроника 2014-07-08](https://en.wikipedia.org/wiki/Portal:Current_events/2014_July_8) |
| 2014-07-20 | 2014-07-20 | Monty Python дали прощальное шоу | [Wikipedia · хроника 2014-07-20](https://en.wikipedia.org/wiki/Portal:Current_events/2014_July_20) |
| 2014-07-23 | 2014-07-23 | В Глазго открылись Игры Содружества | [Wikipedia · хроника 2014-07-23](https://en.wikipedia.org/wiki/Portal:Current_events/2014_July_23) |
| 2014-07-26 | 2014-07-26 | Taghrooda выиграла скачки в Аскоте | [Wikipedia · хроника 2014-07-26](https://en.wikipedia.org/wiki/Portal:Current_events/2014_July_26) |
| 2014-07-29 | 2014-07-29 | В Steam вышла The Legend of Heroes: Trails in the Sky | [XSEED · блог разработчика локализации](https://www.xseedgames.com/2014/07/24/xseed-blog-the-legend-of-heroes-trails-in-the-sky/) |
| 2014-08-01 | 2014-07-27 | Нибали выиграл «Тур де Франс» | [Wikipedia · хроника 2014-07-27](https://en.wikipedia.org/wiki/Portal:Current_events/2014_July_27) |
| 2014-08-04 | 2014-08-04 | Фото дня NASA: гейзеры Энцелада | [NASA · Astronomy Picture of the Day](https://apod.nasa.gov/apod/ap140804.html) |
| 2014-08-07 | 2014-08-06 | Rosetta добралась до кометы | [Wikipedia · хроника 2014-08-06](https://en.wikipedia.org/wiki/Portal:Current_events/2014_August_6) |
| 2014-08-10 | 2014-08-08 | Вышла Five Nights at Freddy’s | [Wikipedia · хроника 2014-08-08](https://en.wikipedia.org/wiki/Portal:Current_events/2014_August_8) |
| 2014-08-13 | 2014-08-13 | Марьям Мирзахани получила медаль Филдса | [International Mathematical Union · Fields Medals 2014](https://www.mathunion.org/imu-awards/fields-medal/fields-medals-2014) |
| 2014-08-16 | 2014-08-16 | Юношеская Олимпиада открылась в Нанкине | [Wikipedia · хроника 2014-08-16](https://en.wikipedia.org/wiki/Portal:Current_events/2014_August_16) |
| 2014-08-19 | 2014-08-17 | Джаявардене завершает тестовую карьеру | [Wikipedia · хроника 2014-08-17](https://en.wikipedia.org/wiki/Portal:Current_events/2014_August_17) |
| 2014-08-22 | 2014-08-22 | Фото дня NASA: комета Жак рядом с туманностями | [NASA · Astronomy Picture of the Day](https://apod.nasa.gov/apod/ap140822.html) |
| 2014-08-25 | 2014-08-25 | Прошла 66-я церемония «Эмми» | [Wikipedia · хроника 2014-08-25](https://en.wikipedia.org/wiki/Portal:Current_events/2014_August_25) |
| 2014-08-28 | 2014-08-28 | Роналду признан лучшим игроком Европы | [Wikipedia · хроника 2014-08-28](https://en.wikipedia.org/wiki/Portal:Current_events/2014_August_28) |
| 2014-08-31 | 2014-08-29 | Австралийский регулятор оспорил возвраты Steam | [Wikipedia · хроника 2014-08-29](https://en.wikipedia.org/wiki/Portal:Current_events/2014_August_29) |

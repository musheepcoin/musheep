(function(){
  const LS_PLAN_LAYOUT = 'aar_plan_layout_v1';
  const LS_PLAN_LAYOUT_VERSION = 'aar_plan_layout_version_v1';
  const LS_PLAN_LANE_HEIGHTS = 'aar_plan_lane_heights_v1';
  const LS_PLAN_GLOBAL_LOCK = 'aar_plan_global_lock_v1';
  const LS_PLAN_BLOCK_SCALE = 'aar_plan_block_scale_v1';
  const LS_PLAN_EXPORT_NAME = 'aar_plan_layout_export';
  const LS_PLAN_ELEVATORS = 'aar_plan_elevators_v1';
  const LS_PLAN_ROOMSTATE_META = 'aar_plan_roomstate_meta_v1';
  const LS_PLAN_ARRIVALS_META = 'aar_plan_arrivals_meta_v2';
  const LS_PLAN_ARRIVALS_REQUIREMENTS = 'aar_plan_arrivals_requirements_v2';
  const LS_PLAN_NIGHT_INPUT = 'aar_plan_night_input_v1';
  const LS_PLAN_FADE_NON_ACTIONABLE = 'aar_plan_fade_non_actionable_v1';
  const LS_PLAN_FADE_OPACITY = 'aar_plan_fade_opacity_v1';
  const LS_PLAN_CROSSED_EQUIPMENT = 'aar_plan_crossed_equipment_v1';
  const LS_PLAN_MANUAL_SOFA_ROOMS = 'aar_plan_manual_sofa_rooms_v1';
  const LS_PLAN_VISUAL_FILTERS = 'aar_plan_visual_filters_v1';
  const LS_PLAN_COUNT_MODE = 'aar_plan_count_mode_v1';
  const LS_PLAN_LIST_VISIBLE = 'aar_plan_list_visible_v1';
  const LS_PLAN_LIST_COMPACT = 'aar_plan_list_compact_v1';
  const LS_PLAN_SECTION_COLLAPSE = 'aar_plan_section_collapse_v1';
  const LS_RULES = 'aar_soiree_rules_v2';
  const DEFAULT_PLAN_SOFA_RULES = {
    '1A+0E':'0','1A+1E':'1','1A+2E':'2','1A+3E':'2',
    '2A+0E':'0','2A+1E':'1','2A+2E':'2','2A+3E':'2',
    '3A+0E':'1','3A+1E':'2'
  };
  const PLAN_LAYOUT_VERSION = 'grid_rebuild_v12_touching';
  const byId = (id)=>document.getElementById(id);
  const PLAN_LANE_GAP = 10;
  const PLAN_PADDING_X = 24;
  const PLAN_PADDING_Y = 24;
  const BASE_ROOM_WIDTH = 72;
  const BASE_ROOM_HEIGHT = 54;
  const LEGACY_SOURCE_COL_STEP = 92;
  const LEGACY_SOURCE_ROW_STEP = 74;
  const BASE_COL_STEP = 72;
  const BASE_ROW_STEP = 54;
  const DEFAULT_LANE_HEIGHTS = { 'Étage 4': 190, 'Étage 3': 190, 'Étage 2': 190, 'Étage 1': 190 };
  const ELEVATOR_WIDTH = 40;
  const ELEVATOR_HEIGHT = 40;
  const DEFAULT_ELEVATORS = [
    { id: 'lift-a1', name: 'Ascenseur A1', shortLabel: 'A1', x: 784, y: 44 },
    { id: 'lift-a2', name: 'Ascenseur A2', shortLabel: 'A2', x: 852, y: 44 }
  ];
  const DEFAULT_ROOMS = [{"room_num":"129","roomType":"TRI","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 1","x":24,"y":24,"locked":false,"meta":{"room_id":"1000000001","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"130","roomType":"TRI","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 1","x":116,"y":24,"locked":false,"meta":{"room_id":"1000000002","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"131","roomType":"TRI","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 1","x":208,"y":24,"locked":false,"meta":{"room_id":"1000000003","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"132","roomType":"TRI","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 1","x":300,"y":24,"locked":false,"meta":{"room_id":"1000000004","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"133","roomType":"TRI","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 1","x":392,"y":24,"locked":false,"meta":{"room_id":"1000000005","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"134","roomType":"TRI","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 1","x":484,"y":24,"locked":false,"meta":{"room_id":"1000000006","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"135","roomType":"TRI","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 1","x":576,"y":24,"locked":false,"meta":{"room_id":"1000000007","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"136","roomType":"TRI","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 1","x":668,"y":24,"locked":false,"meta":{"room_id":"1000000008","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"137","roomType":"TRI","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 1","x":24,"y":98,"locked":false,"meta":{"room_id":"1000000009","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"138","roomType":"TRI","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 1","x":116,"y":98,"locked":false,"meta":{"room_id":"1000000010","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"139","roomType":"TRI","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 1","x":208,"y":98,"locked":false,"meta":{"room_id":"1000000011","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"140","roomType":"TRI","roomState":"Occupée","etat":"OCC-Sal","floor":"Étage 1","x":300,"y":98,"locked":false,"meta":{"room_id":"1000000012","GUES_NAME":"DRIVER","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"04/02/26","Stay":"Présent","CLST_ID":"2","remarque":"<B>R/INTERN:</B> 20 TWINS + 2 SINGLES (UTILISATEUR)<br/><B>S/INTERN:</B> DRIVER (UTILISATEUR)","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False","Adults":"1","Children":"0","ArrivalHour":"15:50"}},{"room_num":"141","roomType":"TRI","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 1","x":392,"y":98,"locked":false,"meta":{"room_id":"1000000013","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"02/02/26","CLST_ID":"2","remarque":"RAF","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"142","roomType":"TRI","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 1","x":484,"y":98,"locked":false,"meta":{"room_id":"1000000014","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"02/02/26","CLST_ID":"2","remarque":"RAF","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"143","roomType":"TRI","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 1","x":576,"y":98,"locked":false,"meta":{"room_id":"1000000015","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"02/02/26","CLST_ID":"2","remarque":"RAF","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"144","roomType":"TRI","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 1","x":668,"y":98,"locked":false,"meta":{"room_id":"1000000016","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"02/02/26","CLST_ID":"2","remarque":"RAF","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"145","roomType":"TRI","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 1","x":24,"y":172,"locked":false,"meta":{"room_id":"1000000017","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"02/02/26","CLST_ID":"2","remarque":"RAF","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"146","roomType":"TRI","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 1","x":116,"y":172,"locked":false,"meta":{"room_id":"1000000018","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"02/02/26","CLST_ID":"2","remarque":"RAF","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"147","roomType":"TRI","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 1","x":208,"y":172,"locked":false,"meta":{"room_id":"1000000019","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"148","roomType":"TRI","roomState":"Occupée","etat":"OCC-Sal","floor":"Étage 1","x":300,"y":172,"locked":false,"meta":{"room_id":"1000000020","GUES_NAME":"FENG","GUES_FIRSTNAME":"Xiaojun","serv_date_start_cnv":"30/01/26","serv_date_end_cnv":"10/02/26","Stay":"Présent","CLST_ID":"2","remarque":"<B>R/FORCG:</B> DISPO (CRS)<br/><B>S/INTERN:</B> RSP (UTILISATEUR)","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False","Adults":"1","Children":"0","ArrivalHour":"07:04","DepartureHour":"12:00"}},{"room_num":"149","roomType":"TRI","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 1","x":392,"y":172,"locked":false,"meta":{"room_id":"1000000021","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"150","roomType":"TRI","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 1","x":484,"y":172,"locked":false,"meta":{"room_id":"1000000022","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"160","roomType":"PRIVM","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 1","x":576,"y":172,"locked":false,"meta":{"room_id":"1000000023","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"02/02/26","CLST_ID":"2","remarque":"RAF","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"161","roomType":"PRIVM","roomState":"Occupée","etat":"OCC-Sal","floor":"Étage 1","x":668,"y":172,"locked":false,"meta":{"room_id":"1000000024","GUES_NAME":"TRIPLE","serv_date_start_cnv":"30/01/26","serv_date_end_cnv":"07/02/26","Stay":"Présent","CLST_ID":"2","remarque":"<B>S/INTERN:</B> triple - ouvrir 2 sofa (UTILISATEUR)","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False","Adults":"3","Children":"0","ArrivalHour":"16:36","DepartureHour":"17:00"}},{"room_num":"162","roomType":"PRIVM","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 1","x":24,"y":246,"locked":false,"meta":{"room_id":"1000000025","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"02/02/26","CLST_ID":"2","remarque":"RAF","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"163","roomType":"PRIVM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 1","x":116,"y":246,"locked":false,"meta":{"room_id":"1000000026","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"164","roomType":"PRIVM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 1","x":208,"y":246,"locked":false,"meta":{"room_id":"1000000027","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"165","roomType":"PRIVM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 1","x":300,"y":246,"locked":false,"meta":{"room_id":"1000000028","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"166","roomType":"PRIVM","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 1","x":392,"y":246,"locked":false,"meta":{"room_id":"1000000029","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"02/02/26","CLST_ID":"2","remarque":"RAF","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"167","roomType":"PRIVM","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 1","x":484,"y":246,"locked":false,"meta":{"room_id":"1000000030","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"02/02/26","CLST_ID":"2","remarque":"RAF","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"168","roomType":"PRIVM","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 1","x":576,"y":246,"locked":false,"meta":{"room_id":"1000000031","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"02/02/26","CLST_ID":"2","remarque":"RAF","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"169","roomType":"PRIVM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 1","x":668,"y":246,"locked":false,"meta":{"room_id":"1000000032","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"170","roomType":"PRIVM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 1","x":24,"y":320,"locked":false,"meta":{"room_id":"1000000033","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"171","roomType":"PRIVM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 1","x":116,"y":320,"locked":false,"meta":{"room_id":"1000000034","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"172","roomType":"PRIVM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 1","x":208,"y":320,"locked":false,"meta":{"room_id":"1000000035","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"173","roomType":"PRIVM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 1","x":300,"y":320,"locked":false,"meta":{"room_id":"1000000036","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"174","roomType":"PRIVM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 1","x":392,"y":320,"locked":false,"meta":{"room_id":"1000000037","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"175","roomType":"PRIVM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 1","x":484,"y":320,"locked":false,"meta":{"room_id":"1000000038","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"176","roomType":"PRIVM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 1","x":576,"y":320,"locked":false,"meta":{"room_id":"1000000039","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"177","roomType":"PRIVM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 1","x":668,"y":320,"locked":false,"meta":{"room_id":"1000000040","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"178","roomType":"PRIVM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 1","x":24,"y":394,"locked":false,"meta":{"room_id":"1000000041","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"179","roomType":"PRIVM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 1","x":116,"y":394,"locked":false,"meta":{"room_id":"1000000042","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"180","roomType":"PRIVM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 1","x":208,"y":394,"locked":false,"meta":{"room_id":"1000000043","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"181","roomType":"PRIVM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 1","x":300,"y":394,"locked":false,"meta":{"room_id":"1000000044","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"182","roomType":"PRIVM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 1","x":392,"y":394,"locked":false,"meta":{"room_id":"1000000045","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"183","roomType":"PRIVM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 1","x":484,"y":394,"locked":false,"meta":{"room_id":"1000000046","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"184","roomType":"PRIVM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 1","x":576,"y":394,"locked":false,"meta":{"room_id":"1000000047","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"185","roomType":"PRIVM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 1","x":668,"y":394,"locked":false,"meta":{"room_id":"1000000048","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"186","roomType":"PRIVM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 1","x":24,"y":468,"locked":false,"meta":{"room_id":"1000000049","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"220","roomType":"TRI","roomState":"Occupée","etat":"OCC-Sal","floor":"Étage 2","x":24,"y":24,"locked":false,"meta":{"room_id":"1000000050","GUES_NAME":"TWIN","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"04/02/26","Stay":"Présent","CLST_ID":"2","remarque":"<B>R/INTERN:</B> 20 TWINS + 2 SINGLES (UTILISATEUR)<br/><B>S/INTERN:</B> TWINS (UTILISATEUR)","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False","Adults":"2","Children":"0","ArrivalHour":"15:50"}},{"room_num":"221","roomType":"TRI","roomState":"Libre","etat":"LIB-Sal","floor":"Étage 2","x":116,"y":24,"locked":false,"meta":{"room_id":"1000000051","CLST_ID":"2","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"222","roomType":"TRI","roomState":"Occupée","etat":"OCC-Sal","floor":"Étage 2","x":208,"y":24,"locked":false,"meta":{"room_id":"1000000052","GUES_NAME":"TWIN","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"04/02/26","Stay":"Présent","CLST_ID":"2","remarque":"<B>R/INTERN:</B> 20 TWINS + 2 SINGLES (UTILISATEUR)<br/><B>S/INTERN:</B> TWINS (UTILISATEUR)","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False","Adults":"2","Children":"0","ArrivalHour":"15:50"}},{"room_num":"223","roomType":"TRI","roomState":"Occupée","etat":"OCC-Sal","floor":"Étage 2","x":300,"y":24,"locked":false,"meta":{"room_id":"1000000053","GUES_NAME":"TWIN","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"04/02/26","Stay":"Présent","CLST_ID":"2","remarque":"<B>R/INTERN:</B> 20 TWINS + 2 SINGLES (UTILISATEUR)<br/><B>S/INTERN:</B> TWINS (UTILISATEUR)","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False","Adults":"2","Children":"0","ArrivalHour":"15:50"}},{"room_num":"224","roomType":"TRI","roomState":"Occupée","etat":"OCC-Sal","floor":"Étage 2","x":392,"y":24,"locked":false,"meta":{"room_id":"1000000054","GUES_NAME":"TWIN","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"04/02/26","Stay":"Présent","CLST_ID":"2","remarque":"<B>R/INTERN:</B> 20 TWINS + 2 SINGLES (UTILISATEUR)<br/><B>S/INTERN:</B> TWINS (UTILISATEUR)","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False","Adults":"2","Children":"0","ArrivalHour":"15:50"}},{"room_num":"225","roomType":"TRI","roomState":"Occupée","etat":"OCC-Sal","floor":"Étage 2","x":484,"y":24,"locked":false,"meta":{"room_id":"1000000055","GUES_NAME":"TWIN","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"04/02/26","Stay":"Présent","CLST_ID":"2","remarque":"<B>R/INTERN:</B> 20 TWINS + 2 SINGLES (UTILISATEUR)<br/><B>S/INTERN:</B> TWINS (UTILISATEUR)","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False","Adults":"2","Children":"0","ArrivalHour":"15:50"}},{"room_num":"226","roomType":"TRI","roomState":"Occupée","etat":"OCC-Sal","floor":"Étage 2","x":576,"y":24,"locked":false,"meta":{"room_id":"1000000056","GUES_NAME":"TWIN","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"04/02/26","Stay":"Présent","CLST_ID":"2","remarque":"<B>R/INTERN:</B> 20 TWINS + 2 SINGLES (UTILISATEUR)<br/><B>S/INTERN:</B> TWINS (UTILISATEUR)","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False","Adults":"2","Children":"0","ArrivalHour":"15:50"}},{"room_num":"227","roomType":"TRI","roomState":"Occupée","etat":"OCC-Sal","floor":"Étage 2","x":668,"y":24,"locked":false,"meta":{"room_id":"1000000057","GUES_NAME":"PHAN","GUES_FIRSTNAME":"Linh","serv_date_start_cnv":"04/11/25","serv_date_end_cnv":"06/03/26","Stay":"Présent","CLST_ID":"2","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False","Adults":"1","Children":"0","ArrivalHour":"17:49"}},{"room_num":"228","roomType":"TRI","roomState":"Occupée","etat":"OCC-Sal","floor":"Étage 2","x":24,"y":98,"locked":false,"meta":{"room_id":"1000000058","GUES_NAME":"TWIN","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"04/02/26","Stay":"Présent","CLST_ID":"2","remarque":"<B>R/INTERN:</B> 20 TWINS + 2 SINGLES (UTILISATEUR)<br/><B>S/INTERN:</B> TWINS (UTILISATEUR)","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False","Adults":"2","Children":"0","ArrivalHour":"15:50"}},{"room_num":"229","roomType":"TRI","roomState":"Occupée","etat":"OCC-Sal","floor":"Étage 2","x":116,"y":98,"locked":false,"meta":{"room_id":"1000000059","GUES_NAME":"TWIN","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"04/02/26","Stay":"Présent","CLST_ID":"2","remarque":"<B>R/INTERN:</B> 20 TWINS + 2 SINGLES (UTILISATEUR)<br/><B>S/INTERN:</B> TWINS (UTILISATEUR)","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False","Adults":"2","Children":"0","ArrivalHour":"15:50"}},{"room_num":"230","roomType":"TRI","roomState":"Occupée","etat":"OCC-Sal","floor":"Étage 2","x":208,"y":98,"locked":false,"meta":{"room_id":"1000000060","GUES_NAME":"MAIREL","GUES_FIRSTNAME":"JAMES","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"02/02/26","Stay":"Présent","CLST_ID":"2","remarque":"<B>R/HOTEL:</B> RSP IN (CRS)<br/><B>S/INTERN:</B> RSP IN - Telephone le 2701 - 230 demandée (UTILISATEUR)","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False","Adults":"1","Children":"0","ArrivalHour":"16:45","DepartureHour":"12:00"}},{"room_num":"231","roomType":"TRI","roomState":"Occupée","etat":"OCC-Sal","floor":"Étage 2","x":300,"y":98,"locked":false,"meta":{"room_id":"1000000061","GUES_NAME":"TWIN","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"04/02/26","Stay":"Présent","CLST_ID":"2","remarque":"<B>R/INTERN:</B> 20 TWINS + 2 SINGLES (UTILISATEUR)<br/><B>S/INTERN:</B> TWINS (UTILISATEUR)","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False","Adults":"2","Children":"0","ArrivalHour":"15:50"}},{"room_num":"232","roomType":"TRI","roomState":"Occupée","etat":"OCC-Sal","floor":"Étage 2","x":392,"y":98,"locked":false,"meta":{"room_id":"1000000062","GUES_NAME":"TWIN","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"04/02/26","Stay":"Présent","CLST_ID":"2","remarque":"<B>R/INTERN:</B> 20 TWINS + 2 SINGLES (UTILISATEUR)<br/><B>S/INTERN:</B> TWINS (UTILISATEUR)","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False","Adults":"2","Children":"0","ArrivalHour":"15:50"}},{"room_num":"233","roomType":"TRI","roomState":"Occupée","etat":"OCC-Sal","floor":"Étage 2","x":484,"y":98,"locked":false,"meta":{"room_id":"1000000063","GUES_NAME":"TWIN","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"04/02/26","Stay":"Présent","CLST_ID":"2","remarque":"<B>R/INTERN:</B> 20 TWINS + 2 SINGLES (UTILISATEUR)<br/><B>S/INTERN:</B> TWINS (UTILISATEUR)","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False","Adults":"2","Children":"0","ArrivalHour":"15:50"}},{"room_num":"234","roomType":"TRI","roomState":"Occupée","etat":"OCC-Sal","floor":"Étage 2","x":576,"y":98,"locked":false,"meta":{"room_id":"1000000064","GUES_NAME":"TWIN","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"04/02/26","Stay":"Présent","CLST_ID":"2","remarque":"<B>R/INTERN:</B> 20 TWINS + 2 SINGLES (UTILISATEUR)<br/><B>S/INTERN:</B> TWIN (UTILISATEUR)","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False","Adults":"2","Children":"0","ArrivalHour":"15:50"}},{"room_num":"235","roomType":"TRI","roomState":"Occupée","etat":"OCC-Sal","floor":"Étage 2","x":668,"y":98,"locked":false,"meta":{"room_id":"1000000065","GUES_NAME":"SINGLE","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"04/02/26","Stay":"Présent","CLST_ID":"2","remarque":"<B>R/INTERN:</B> 20 TWINS + 2 SINGLES (UTILISATEUR)<br/><B>S/INTERN:</B> SINGLE (UTILISATEUR)","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False","Adults":"1","Children":"0","ArrivalHour":"15:50"}},{"room_num":"236","roomType":"TRI","roomState":"Occupée","etat":"OCC-Sal","floor":"Étage 2","x":24,"y":172,"locked":false,"meta":{"room_id":"1000000066","GUES_NAME":"DOUBLE","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"04/02/26","Stay":"Présent","CLST_ID":"2","remarque":"<B>R/INTERN:</B> 20 TWINS + 2 SINGLES (UTILISATEUR)<br/><B>S/INTERN:</B> DOUBLE (UTILISATEUR)","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False","Adults":"2","Children":"0","ArrivalHour":"15:50"}},{"room_num":"237","roomType":"TRI","roomState":"Occupée","etat":"OCC-Sal","floor":"Étage 2","x":116,"y":172,"locked":false,"meta":{"room_id":"1000000067","GUES_NAME":"DIMITROV","GUES_FIRSTNAME":"RADINA","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"06/02/26","Stay":"Présent","CLST_ID":"2","remarque":"<B>R/CLIENT:</B> Children Age: 0 year(s) old (CRS)<br/><B>S/INTERN:</B> RSP IN (UTILISATEUR) - Equipement Chambre (1 SOFA)","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"True","MinMainReason":"Equipement Chambre","MinMainComment":"1 SOFA","Adults":"2","Children":"1","ArrivalHour":"17:13","DepartureHour":"12:00"}},{"room_num":"238","roomType":"TRI","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 2","x":208,"y":172,"locked":false,"meta":{"room_id":"1000000068","CLST_ID":"1","remarque":"- Equipement Chambre (1 SOFA)","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"True","MinMainReason":"Equipement Chambre","MinMainComment":"1 SOFA"}},{"room_num":"239","roomType":"TRI","roomState":"Occupée","etat":"OCC-Sal","floor":"Étage 2","x":300,"y":172,"locked":false,"meta":{"room_id":"1000000069","GUES_NAME":"TWIN","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"04/02/26","Stay":"Présent","CLST_ID":"2","remarque":"<B>R/INTERN:</B> 20 TWINS + 2 SINGLES (UTILISATEUR)<br/><B>S/INTERN:</B> TWINS (UTILISATEUR)","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False","Adults":"2","Children":"0","ArrivalHour":"15:50"}},{"room_num":"240","roomType":"TRI","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 2","x":392,"y":172,"locked":false,"meta":{"room_id":"1000000070","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"241","roomType":"TRI","roomState":"Occupée","etat":"OCC-Sal","floor":"Étage 2","x":484,"y":172,"locked":false,"meta":{"room_id":"1000000071","GUES_NAME":"MBONDA CHIMI","GUES_FIRSTNAME":"Paul Cedric","serv_date_start_cnv":"31/01/26","serv_date_end_cnv":"03/02/26","Stay":"Présent","CLST_ID":"2","remarque":"<B>R/ALERT:</B> Online check-in (CRS) <span style=font-family: wingdings font-size: 300%\">&#252</span><br/><B>S/INTERN:</B> APOL ROTX - VISA 4754 (UTILISATEUR)\"","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False","Adults":"1","Children":"0","ArrivalHour":"12:08","DepartureHour":"12:00"}},{"room_num":"242","roomType":"TRI","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 2","x":576,"y":172,"locked":false,"meta":{"room_id":"1000000072","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"243","roomType":"TRI","roomState":"Occupée","etat":"OCC-Sal","floor":"Étage 2","x":668,"y":172,"locked":false,"meta":{"room_id":"1000000073","GUES_NAME":"CHATEL","GUES_FIRSTNAME":"DANIEL","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"02/02/26","Stay":"Présent","CLST_ID":"2","remarque":"<B>R/FACTUR:</B> BWP : automatic integration of Voucher payment (CRS)<br/><B>S/INTERN:</B> RSP (UTILISATEUR)","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False","Adults":"2","Children":"0","ArrivalHour":"15:33","DepartureHour":"12:00"}},{"room_num":"244","roomType":"TRI","roomState":"Occupée","etat":"OCC-Sal","floor":"Étage 2","x":24,"y":246,"locked":false,"meta":{"room_id":"1000000074","GUES_NAME":"MURAD","GUES_FIRSTNAME":"Fatema Khaled Abdulla","serv_date_start_cnv":"31/01/26","serv_date_end_cnv":"02/02/26","Stay":"Présent","CLST_ID":"2","remarque":"<B>R/HOTEL:</B> Twin Bed\",\"Early Check In 09:00\" 1 Double Bed and 1 Double Sofa Bed NO SMOKING - - POS : Expedia Affiliate Network (CRS)<br/><B>S/INTERN:</B> DEBIT VCC RO - RSP IN TS (UTILISATEUR)\"","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False","Adults":"2","Children":"0","ArrivalHour":"12:09","DepartureHour":"12:00"}},{"room_num":"245","roomType":"TRI","roomState":"Occupée","etat":"OCC-Sal","floor":"Étage 2","x":116,"y":246,"locked":false,"meta":{"room_id":"1000000075","GUES_NAME":"VIVIER","GUES_FIRSTNAME":"GAEL","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"02/02/26","Stay":"Présent","CLST_ID":"2","remarque":"<B>R/CLIENT:</B> HRS booking id 317834447. Hotel Loyalty ID 30810310845592ZQ (CRS)<br/><B>S/INTERN:</B> PEC BBTS AMEX 3991 - MAIL 01/02 (UTILISATEUR)","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False","Adults":"1","Children":"0","ArrivalHour":"21:23","DepartureHour":"12:00"}},{"room_num":"246","roomType":"TRI","roomState":"Libre","etat":"LIB-Sal","floor":"Étage 2","x":208,"y":246,"locked":false,"meta":{"room_id":"1000000076","CLST_ID":"2","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"247","roomType":"TRI","roomState":"Occupée","etat":"OCC-Sal","floor":"Étage 2","x":300,"y":246,"locked":false,"meta":{"room_id":"1000000077","GUES_NAME":"LASO","GUES_FIRSTNAME":"ALBERTO","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"03/02/26","Stay":"Présent","CLST_ID":"2","remarque":"<B>R/HOTEL:</B> FAE MAIL 19/12 14:05 (CRS)<br/><B>S/INTERN:</B> FAE BBTS + DINER MAIL 19/12 (UTILISATEUR)","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False","Adults":"1","Children":"0","ArrivalHour":"15:40","DepartureHour":"12:00"}},{"room_num":"248","roomType":"TRI","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 2","x":392,"y":246,"locked":false,"meta":{"room_id":"1000000078","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"02/02/26","CLST_ID":"2","remarque":"RAF","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"249","roomType":"TRI","roomState":"Occupée","etat":"OCC-Sal","floor":"Étage 2","x":484,"y":246,"locked":false,"meta":{"room_id":"1000000079","GUES_NAME":"DROUHET","GUES_FIRSTNAME":"CHRISTOPHE","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"02/02/26","Stay":"Présent","CLST_ID":"2","remarque":"<B>R/FACTUR:</B> APOL (CRS)<br/><B>S/INTERN:</B> APOL ROTX - MC 2924 (UTILISATEUR)","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False","Adults":"1","Children":"0","ArrivalHour":"19:32","DepartureHour":"12:00"}},{"room_num":"250","roomType":"TRI","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 2","x":576,"y":246,"locked":false,"meta":{"room_id":"1000000080","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"02/02/26","CLST_ID":"2","remarque":"RAF","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"251","roomType":"TRI","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 2","x":668,"y":246,"locked":false,"meta":{"room_id":"1000000081","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"02/02/26","CLST_ID":"2","remarque":"RAF","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"252","roomType":"TRI","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 2","x":24,"y":320,"locked":false,"meta":{"room_id":"1000000082","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"02/02/26","CLST_ID":"2","remarque":"RAF","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"253","roomType":"TRI","roomState":"Occupée","etat":"OCC-Sal","floor":"Étage 2","x":116,"y":320,"locked":false,"meta":{"room_id":"1000000083","GUES_NAME":"TRÉMEAU","GUES_FIRSTNAME":"JEAN-JACQUES","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"03/02/26","Stay":"Présent","CLST_ID":"2","remarque":"<B>R/HOTEL:</B> RSP (CRS)<br/><B>S/INTERN:</B> RSP (UTILISATEUR)","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False","Adults":"2","Children":"0","ArrivalHour":"16:27","DepartureHour":"12:00"}},{"room_num":"254","roomType":"TRI","roomState":"Occupée","etat":"OCC-Sal","floor":"Étage 2","x":208,"y":320,"locked":false,"meta":{"room_id":"1000000084","GUES_NAME":"T/L LI HUI","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"04/02/26","Stay":"Présent","CLST_ID":"2","remarque":"<B>R/INTERN:</B> 20 TWINS + 2 SINGLES (UTILISATEUR)<br/><B>S/INTERN:</B> SINGLE (UTILISATEUR)","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False","Adults":"1","Children":"0","ArrivalHour":"15:50"}},{"room_num":"255","roomType":"TRI","roomState":"Occupée","etat":"OCC-Sal","floor":"Étage 2","x":300,"y":320,"locked":false,"meta":{"room_id":"1000000085","GUES_NAME":"CARPENTIER","GUES_FIRSTNAME":"ANTOINE","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"03/02/26","Stay":"Présent","CLST_ID":"2","remarque":"<B>R/HOTEL:</B> 1 Double Bed and 1 Twin Sofa Bed NO SMOKING - - POS : Expedia Affiliate Network (CRS)<br/><B>S/INTERN:</B> PEC RO MC 6617 - RSP IN TS + PEC TDS ET PDJ CB 2387 (UTILISATEUR)","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False","Adults":"1","Children":"0","ArrivalHour":"20:40","DepartureHour":"12:00"}},{"room_num":"256","roomType":"TRI","roomState":"Occupée","etat":"OCC-Sal","floor":"Étage 2","x":392,"y":320,"locked":false,"meta":{"room_id":"1000000086","GUES_NAME":"RAMOND","GUES_FIRSTNAME":"MARIE","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"02/02/26","Stay":"Présent","CLST_ID":"2","remarque":"<B>S/INTERN:</B> RSP IN (UTILISATEUR)","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False","Adults":"1","Children":"0","ArrivalHour":"22:37","DepartureHour":"12:00"}},{"room_num":"257","roomType":"TRI","roomState":"Occupée","etat":"OCC-Sal","floor":"Étage 2","x":484,"y":320,"locked":false,"meta":{"room_id":"1000000087","GUES_NAME":"PALMONT","GUES_FIRSTNAME":"KÉVIN","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"02/02/26","Stay":"Présent","CLST_ID":"2","remarque":"<B>R/CLIENT:</B> Children Age: 0 year(s) old (CRS)<br/><B>S/INTERN:</B> RSP IN (UTILISATEUR)","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False","Adults":"2","Children":"1","ArrivalHour":"12:54","DepartureHour":"12:00"}},{"room_num":"258","roomType":"TRI","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 2","x":576,"y":320,"locked":false,"meta":{"room_id":"1000000088","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"02/02/26","CLST_ID":"2","remarque":"RAF","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"260","roomType":"STDM","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 2","x":668,"y":320,"locked":false,"meta":{"room_id":"1000000089","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"02/02/26","CLST_ID":"2","remarque":"RAF","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"261","roomType":"STDM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 2","x":24,"y":394,"locked":false,"meta":{"room_id":"1000000090","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"262","roomType":"STDM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 2","x":116,"y":394,"locked":false,"meta":{"room_id":"1000000091","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"263","roomType":"STDM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 2","x":208,"y":394,"locked":false,"meta":{"room_id":"1000000092","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"264","roomType":"STDM","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 2","x":300,"y":394,"locked":false,"meta":{"room_id":"1000000093","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"02/02/26","CLST_ID":"2","remarque":"RAF","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"265","roomType":"STDM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 2","x":392,"y":394,"locked":false,"meta":{"room_id":"1000000094","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"266","roomType":"STDM","roomState":"Occupée","etat":"OCC-Sal","floor":"Étage 2","x":484,"y":394,"locked":false,"meta":{"room_id":"1000000095","GUES_NAME":"CASSAGNADE","GUES_FIRSTNAME":"FLORENT","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"06/02/26","Stay":"Présent","CLST_ID":"2","remarque":"<B>R/HOTEL:</B> RSP (CRS)<br/><B>S/INTERN:</B> RSP (UTILISATEUR)","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False","Adults":"1","Children":"0","ArrivalHour":"22:15","DepartureHour":"12:00"}},{"room_num":"267","roomType":"STDM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 2","x":576,"y":394,"locked":false,"meta":{"room_id":"1000000096","CLST_ID":"1","remarque":"- Equipement Chambre (2 SOFA)","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"True","MinMainReason":"Equipement Chambre","MinMainComment":"2 SOFA"}},{"room_num":"268","roomType":"STDM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 2","x":668,"y":394,"locked":false,"meta":{"room_id":"1000000097","CLST_ID":"1","remarque":"- Equipement Chambre (2 sofa)","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"True","MinMainReason":"Equipement Chambre","MinMainComment":"2 sofa"}},{"room_num":"269","roomType":"STDM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 2","x":24,"y":468,"locked":false,"meta":{"room_id":"1000000098","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"270","roomType":"STDM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 2","x":116,"y":468,"locked":false,"meta":{"room_id":"1000000099","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"271","roomType":"STDM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 2","x":208,"y":468,"locked":false,"meta":{"room_id":"1000000100","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"272","roomType":"STDM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 2","x":300,"y":468,"locked":false,"meta":{"room_id":"1000000101","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"273","roomType":"STDM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 2","x":392,"y":468,"locked":false,"meta":{"room_id":"1000000102","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"274","roomType":"STDM","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 2","x":484,"y":468,"locked":false,"meta":{"room_id":"1000000103","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"02/02/26","CLST_ID":"2","remarque":"RAF","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"275","roomType":"STDM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 2","x":576,"y":468,"locked":false,"meta":{"room_id":"1000000104","CLST_ID":"1","remarque":"- Equipement Chambre (SOFA)","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"True","MinMainReason":"Equipement Chambre","MinMainComment":"SOFA"}},{"room_num":"276","roomType":"STDM","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 2","x":668,"y":468,"locked":false,"meta":{"room_id":"1000000105","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"02/02/26","CLST_ID":"2","remarque":"RAF","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"277","roomType":"STDM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 2","x":24,"y":542,"locked":false,"meta":{"room_id":"1000000106","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"278","roomType":"STDM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 2","x":116,"y":542,"locked":false,"meta":{"room_id":"1000000107","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"279","roomType":"STDM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 2","x":208,"y":542,"locked":false,"meta":{"room_id":"1000000108","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"280","roomType":"STDM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 2","x":300,"y":542,"locked":false,"meta":{"room_id":"1000000109","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"281","roomType":"STDM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 2","x":392,"y":542,"locked":false,"meta":{"room_id":"1000000110","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"282","roomType":"STDM","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 2","x":484,"y":542,"locked":false,"meta":{"room_id":"1000000111","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"02/02/26","CLST_ID":"2","remarque":"RAF","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"283","roomType":"STDM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 2","x":576,"y":542,"locked":false,"meta":{"room_id":"1000000112","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"284","roomType":"STDM","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 2","x":668,"y":542,"locked":false,"meta":{"room_id":"1000000113","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"02/02/26","CLST_ID":"2","remarque":"RAF","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"285","roomType":"STDM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 2","x":24,"y":616,"locked":false,"meta":{"room_id":"1000000114","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"286","roomType":"STDM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 2","x":116,"y":616,"locked":false,"meta":{"room_id":"1000000115","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"287","roomType":"STDM","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 2","x":208,"y":616,"locked":false,"meta":{"room_id":"1000000116","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"320","roomType":"SGE","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":24,"y":24,"locked":false,"meta":{"room_id":"1000000117","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"321","roomType":"SGE","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":116,"y":24,"locked":false,"meta":{"room_id":"1000000118","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"322","roomType":"SGE","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":208,"y":24,"locked":false,"meta":{"room_id":"1000000119","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"323","roomType":"SGE","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":300,"y":24,"locked":false,"meta":{"room_id":"1000000120","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"324","roomType":"SGE","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":392,"y":24,"locked":false,"meta":{"room_id":"1000000121","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"325","roomType":"SGE","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":484,"y":24,"locked":false,"meta":{"room_id":"1000000122","CLST_ID":"1","remarque":"- Equipement Chambre (1 SOFA)","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"True","MinMainReason":"Equipement Chambre","MinMainComment":"1 SOFA"}},{"room_num":"326","roomType":"SGE","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":576,"y":24,"locked":false,"meta":{"room_id":"1000000123","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"327","roomType":"SGE","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":668,"y":24,"locked":false,"meta":{"room_id":"1000000124","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"328","roomType":"SGE","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":24,"y":98,"locked":false,"meta":{"room_id":"1000000125","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"329","roomType":"SGE","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":116,"y":98,"locked":false,"meta":{"room_id":"1000000126","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"330","roomType":"SGE","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 3","x":208,"y":98,"locked":false,"meta":{"room_id":"1000000127","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"02/02/26","CLST_ID":"2","remarque":"RAF","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"331","roomType":"SGE","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":300,"y":98,"locked":false,"meta":{"room_id":"1000000128","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"332","roomType":"SGE","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 3","x":392,"y":98,"locked":false,"meta":{"room_id":"1000000129","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"02/02/26","CLST_ID":"2","remarque":"RAF","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"333","roomType":"SGE","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":484,"y":98,"locked":false,"meta":{"room_id":"1000000130","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"334","roomType":"SGE","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":576,"y":98,"locked":false,"meta":{"room_id":"1000000131","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"335","roomType":"SGE","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":668,"y":98,"locked":false,"meta":{"room_id":"1000000132","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"336","roomType":"SGE","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":24,"y":172,"locked":false,"meta":{"room_id":"1000000133","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"337","roomType":"SGE","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":116,"y":172,"locked":false,"meta":{"room_id":"1000000134","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"338","roomType":"SGE","roomState":"Occupée","etat":"OCC-Sal","floor":"Étage 3","x":208,"y":172,"locked":false,"meta":{"room_id":"1000000135","GUES_NAME":"N’DANOU","GUES_FIRSTNAME":"Prosper","serv_date_start_cnv":"14/01/26","serv_date_end_cnv":"05/02/26","Stay":"Présent","CLST_ID":"2","remarque":"<B>S/INTERN:</B> RSP IN paiement a la sortie ok DG (UTILISATEUR)","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False","Adults":"1","Children":"0","ArrivalHour":"11:16"}},{"room_num":"340","roomType":"SGE","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":300,"y":172,"locked":false,"meta":{"room_id":"1000000136","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"342","roomType":"SGE","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":392,"y":172,"locked":false,"meta":{"room_id":"1000000137","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"360","roomType":"Exec","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":484,"y":172,"locked":false,"meta":{"room_id":"1000000138","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"361","roomType":"Exec","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":576,"y":172,"locked":false,"meta":{"room_id":"1000000139","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"362","roomType":"Exec","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":668,"y":172,"locked":false,"meta":{"room_id":"1000000140","CLST_ID":"1","remarque":"- Equipement Chambre (2 SOFA)","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"True","MinMainReason":"Equipement Chambre","MinMainComment":"2 SOFA"}},{"room_num":"363","roomType":"Exec","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":24,"y":246,"locked":false,"meta":{"room_id":"1000000141","CLST_ID":"1","remarque":"- Equipement Chambre (2 SOFA)","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"True","MinMainReason":"Equipement Chambre","MinMainComment":"2 SOFA"}},{"room_num":"364","roomType":"Exec","roomState":"Occupée","etat":"OCC-Sal","floor":"Étage 3","x":116,"y":246,"locked":false,"meta":{"room_id":"1000000142","GUES_NAME":"KOSTIC","GUES_FIRSTNAME":"MARKO","serv_date_start_cnv":"01/02/26","serv_date_end_cnv":"02/02/26","Stay":"Présent","CLST_ID":"2","remarque":"<B>R/HOTEL:</B> RSP IN - au desk le 01.02 (CRS)<br/><B>S/INTERN:</B> RSP IN (UTILISATEUR)","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False","Adults":"2","Children":"0","ArrivalHour":"14:55","DepartureHour":"12:00"}},{"room_num":"365","roomType":"Exec","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":208,"y":246,"locked":false,"meta":{"room_id":"1000000143","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"366","roomType":"Exec","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":300,"y":246,"locked":false,"meta":{"room_id":"1000000144","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"367","roomType":"Exec","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":392,"y":246,"locked":false,"meta":{"room_id":"1000000145","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"368","roomType":"Exec","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":484,"y":246,"locked":false,"meta":{"room_id":"1000000146","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"369","roomType":"Exec","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":576,"y":246,"locked":false,"meta":{"room_id":"1000000147","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"370","roomType":"Exec","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":668,"y":246,"locked":false,"meta":{"room_id":"1000000148","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"371","roomType":"Exec","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":24,"y":320,"locked":false,"meta":{"room_id":"1000000149","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"372","roomType":"Exec","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":116,"y":320,"locked":false,"meta":{"room_id":"1000000150","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"373","roomType":"Exec","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":208,"y":320,"locked":false,"meta":{"room_id":"1000000151","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"374","roomType":"Exec","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":300,"y":320,"locked":false,"meta":{"room_id":"1000000152","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"375","roomType":"Exec","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":392,"y":320,"locked":false,"meta":{"room_id":"1000000153","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"376","roomType":"Exec","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":484,"y":320,"locked":false,"meta":{"room_id":"1000000154","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"377","roomType":"Exec","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":576,"y":320,"locked":false,"meta":{"room_id":"1000000155","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"378","roomType":"Exec","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":668,"y":320,"locked":false,"meta":{"room_id":"1000000156","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"379","roomType":"Exec","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 3","x":24,"y":394,"locked":false,"meta":{"room_id":"1000000157","serv_date_start_cnv":"28/01/26","serv_date_end_cnv":"02/02/26","CLST_ID":"2","remarque":"clim hs + mur abîmé","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"380","roomType":"Exec","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":116,"y":394,"locked":false,"meta":{"room_id":"1000000158","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"381","roomType":"Exec","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":208,"y":394,"locked":false,"meta":{"room_id":"1000000159","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"382","roomType":"Exec","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":300,"y":394,"locked":false,"meta":{"room_id":"1000000160","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"383","roomType":"Exec","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":392,"y":394,"locked":false,"meta":{"room_id":"1000000161","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"384","roomType":"Exec","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":484,"y":394,"locked":false,"meta":{"room_id":"1000000162","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"385","roomType":"Exec","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":576,"y":394,"locked":false,"meta":{"room_id":"1000000163","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"386","roomType":"Exec","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":668,"y":394,"locked":false,"meta":{"room_id":"1000000164","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"387","roomType":"Exec","roomState":"Libre","etat":"LIB-Prp","floor":"Étage 3","x":24,"y":468,"locked":false,"meta":{"room_id":"1000000165","CLST_ID":"1","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"460","roomType":"PRIVM","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 4","x":24,"y":24,"locked":false,"meta":{"room_id":"1000000166","serv_date_start_cnv":"07/11/25","serv_date_end_cnv":"13/02/26","CLST_ID":"2","remarque":"RENOVATION CHAMBRE","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"461","roomType":"PRIVM","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 4","x":116,"y":24,"locked":false,"meta":{"room_id":"1000000167","serv_date_start_cnv":"07/11/25","serv_date_end_cnv":"13/02/26","CLST_ID":"2","remarque":"RENOVATION","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"462","roomType":"PRIVM","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 4","x":208,"y":24,"locked":false,"meta":{"room_id":"1000000168","serv_date_start_cnv":"07/11/25","serv_date_end_cnv":"13/02/26","CLST_ID":"2","remarque":"RENOVATION","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"463","roomType":"PRIVM","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 4","x":300,"y":24,"locked":false,"meta":{"room_id":"1000000169","serv_date_start_cnv":"07/11/25","serv_date_end_cnv":"13/02/26","CLST_ID":"2","remarque":"RENOVATION","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"464","roomType":"PRIVM","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 4","x":392,"y":24,"locked":false,"meta":{"room_id":"1000000170","serv_date_start_cnv":"07/11/25","serv_date_end_cnv":"13/02/26","CLST_ID":"2","remarque":"RENOVATION","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"465","roomType":"PRIVM","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 4","x":484,"y":24,"locked":false,"meta":{"room_id":"1000000171","serv_date_start_cnv":"07/11/25","serv_date_end_cnv":"13/02/26","CLST_ID":"2","remarque":"RENOVATION","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"466","roomType":"PRIVM","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 4","x":576,"y":24,"locked":false,"meta":{"room_id":"1000000172","serv_date_start_cnv":"07/11/25","serv_date_end_cnv":"13/02/26","CLST_ID":"2","remarque":"RENOVATION CHAMBRE","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"467","roomType":"PRIVM","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 4","x":668,"y":24,"locked":false,"meta":{"room_id":"1000000173","serv_date_start_cnv":"07/11/25","serv_date_end_cnv":"13/02/26","CLST_ID":"2","remarque":"RENOVATION CHAMBRE","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"468","roomType":"PRIVM","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 4","x":24,"y":98,"locked":false,"meta":{"room_id":"1000000174","serv_date_start_cnv":"07/11/25","serv_date_end_cnv":"13/02/26","CLST_ID":"2","remarque":"RENOVATION CHAMBRE","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"469","roomType":"PRIVM","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 4","x":116,"y":98,"locked":false,"meta":{"room_id":"1000000175","serv_date_start_cnv":"07/11/25","serv_date_end_cnv":"13/02/26","CLST_ID":"2","remarque":"RENOVATION CHAMBRE","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"470","roomType":"PRIVM","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 4","x":208,"y":98,"locked":false,"meta":{"room_id":"1000000176","serv_date_start_cnv":"07/11/25","serv_date_end_cnv":"13/02/26","CLST_ID":"2","remarque":"RENOVATION CHAMBRE","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"471","roomType":"PRIVM","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 4","x":300,"y":98,"locked":false,"meta":{"room_id":"1000000177","serv_date_start_cnv":"07/11/25","serv_date_end_cnv":"13/02/26","CLST_ID":"2","remarque":"RENOVATION CHAMBRE","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"472","roomType":"PRIVM","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 4","x":392,"y":98,"locked":false,"meta":{"room_id":"1000000178","serv_date_start_cnv":"07/11/25","serv_date_end_cnv":"13/02/26","CLST_ID":"2","remarque":"RENOVATION CHAMBRE","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"473","roomType":"PRIVM","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 4","x":484,"y":98,"locked":false,"meta":{"room_id":"1000000179","serv_date_start_cnv":"07/11/25","serv_date_end_cnv":"13/02/26","CLST_ID":"2","remarque":"RENOVATION CHAMBRE","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"474","roomType":"PRIVM","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 4","x":576,"y":98,"locked":false,"meta":{"room_id":"1000000180","serv_date_start_cnv":"07/11/25","serv_date_end_cnv":"13/02/26","CLST_ID":"2","remarque":"RENOVATION CHAMBRE","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"475","roomType":"PRIVM","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 4","x":668,"y":98,"locked":false,"meta":{"room_id":"1000000181","serv_date_start_cnv":"07/11/25","serv_date_end_cnv":"13/02/26","CLST_ID":"2","remarque":"RENOVATION CHAMBRE","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"476","roomType":"PRIVM","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 4","x":24,"y":172,"locked":false,"meta":{"room_id":"1000000182","serv_date_start_cnv":"07/11/25","serv_date_end_cnv":"13/02/26","CLST_ID":"2","remarque":"RENOVATION CHAMBRE","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"477","roomType":"PRIVM","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 4","x":116,"y":172,"locked":false,"meta":{"room_id":"1000000183","serv_date_start_cnv":"07/11/25","serv_date_end_cnv":"13/02/26","CLST_ID":"2","remarque":"RENOVATION CHAMBRE","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"478","roomType":"PRIVM","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 4","x":208,"y":172,"locked":false,"meta":{"room_id":"1000000184","serv_date_start_cnv":"07/11/25","serv_date_end_cnv":"13/02/26","CLST_ID":"2","remarque":"RENOVATION CHAMBRE","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"479","roomType":"PRIVM","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 4","x":300,"y":172,"locked":false,"meta":{"room_id":"1000000185","serv_date_start_cnv":"07/11/25","serv_date_end_cnv":"13/02/26","CLST_ID":"2","remarque":"RENOVATION CHAMBRE","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"480","roomType":"PRIVM","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 4","x":392,"y":172,"locked":false,"meta":{"room_id":"1000000186","serv_date_start_cnv":"07/11/25","serv_date_end_cnv":"13/02/26","CLST_ID":"2","remarque":"RENOVATION CHAMBRE","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"481","roomType":"PRIVM","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 4","x":484,"y":172,"locked":false,"meta":{"room_id":"1000000187","serv_date_start_cnv":"07/11/25","serv_date_end_cnv":"13/02/26","CLST_ID":"2","remarque":"RENOVATION CHAMBRE","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"482","roomType":"PRIVM","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 4","x":576,"y":172,"locked":false,"meta":{"room_id":"1000000188","serv_date_start_cnv":"07/11/25","serv_date_end_cnv":"24/02/26","CLST_ID":"2","remarque":"RENOVATION CHAMBRES","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"483","roomType":"PRIVM","roomState":"Hors Service","etat":"HS-Prp","floor":"Étage 4","x":668,"y":172,"locked":false,"meta":{"room_id":"1000000189","serv_date_start_cnv":"07/11/25","serv_date_end_cnv":"13/02/26","CLST_ID":"1","remarque":"RENOVATION CHAMBRE","pPostPayment":"Y","AccessControlType":"3","menage":"Propre","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"484","roomType":"PRIVM","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 4","x":24,"y":246,"locked":false,"meta":{"room_id":"1000000190","serv_date_start_cnv":"07/11/25","serv_date_end_cnv":"13/02/26","CLST_ID":"2","remarque":"RENOVATION CHAMBRE","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"485","roomType":"PRIVM","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 4","x":116,"y":246,"locked":false,"meta":{"room_id":"1000000191","serv_date_start_cnv":"07/11/25","serv_date_end_cnv":"13/02/26","CLST_ID":"2","remarque":"RENOVATION CHAMBRE","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"486","roomType":"PRIVM","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 4","x":208,"y":246,"locked":false,"meta":{"room_id":"1000000192","serv_date_start_cnv":"07/11/25","serv_date_end_cnv":"13/02/26","CLST_ID":"2","remarque":"RENOVATION CHAMBRE","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}},{"room_num":"487","roomType":"PRIVM","roomState":"Hors Service","etat":"HS-Sal","floor":"Étage 4","x":300,"y":246,"locked":false,"meta":{"room_id":"1000000193","serv_date_start_cnv":"07/11/25","serv_date_end_cnv":"13/02/26","CLST_ID":"2","remarque":"RENOVATION CHAMBRE","pPostPayment":"Y","AccessControlType":"3","menage":"Sale","ROOM_MINMAIN_STATUS":"False"}}];

  function normalizeEtatClass(etat){
    const key = String(etat || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return key ? `state-${key}` : '';
  }

  function parseFrLikeDate(value){
    const raw = String(value || '').trim();
    if (!raw) return null;
    const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{2,4})/);
    if (!m) return null;
    const day = Number(m[1]);
    const month = Number(m[2]);
    const yearRaw = Number(m[3]);
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
    const dt = new Date(Date.UTC(year, month - 1, day));
    if (Number.isNaN(dt.getTime())) return null;
    return dt;
  }

  function toUtcDayKey(date){
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function extractRoomStateReferenceDate(file, parsed){
    const filename = String(file?.name || '');
    const fromName = filename.match(/(20\d{2})(\d{2})(\d{2})/);
    if (fromName) {
      return `${fromName[1]}-${fromName[2]}-${fromName[3]}`;
    }
    const rows = Array.isArray(parsed?.rows) ? parsed.rows : [];
    const counts = new Map();
    rows.forEach((rawRow)=>{
      const row = normalizeImportedRoomStateRow(rawRow);
      const key = toUtcDayKey(parseFrLikeDate(row.Lign_date_cnv || row.serv_date_start_cnv || row.serv_date_end_cnv));
      if (!key) return;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    let bestKey = '';
    let bestCount = -1;
    counts.forEach((count, key)=>{
      if (count > bestCount) {
        bestKey = key;
        bestCount = count;
      }
    });
    if (bestKey) return bestKey;
    return toUtcDayKey(new Date());
  }

  function loadArrivalsRequirements(){
    const raw = safeJsonParse(localStorage.getItem(LS_PLAN_ARRIVALS_REQUIREMENTS) || 'null', null);
    if (!raw || typeof raw !== 'object') return {};
    const next = {};
    Object.entries(raw).forEach(([key, value]) => {
      const type = normalizePlanRoomType(key);
      const count = Math.max(0, Number(value || 0) || 0);
      if (!type || !count) return;
      next[type] = count;
    });
    return next;
  }

  function getPlanSofaRules(){
    const saved = safeJsonParse(localStorage.getItem(LS_RULES) || 'null', null);
    const sofa = saved && typeof saved === 'object' && saved.sofa && typeof saved.sofa === 'object'
      ? saved.sofa
      : null;
    return { ...DEFAULT_PLAN_SOFA_RULES, ...(sofa || {}) };
  }

  function normalizePlanArrivalRoomType(value){
    const raw = normalizePlanRoomType(value);
    if (raw === 'PRIV') return 'PRIVS';
    if (raw === 'PRIVSM') return 'PRIVS';
    return raw;
  }

  function canonicalArrivalKey(header){
    const normalized = normalizeImportHeader(header);
    const map = {
      roomtype: 'ROOM_TYPE',
      room: 'ROOM_TYPE',
      roomcategory: 'ROOM_TYPE',
      nboccad: 'NB_OCC_AD',
      adults: 'NB_OCC_AD',
      adultes: 'NB_OCC_AD',
      adultsnb: 'NB_OCC_AD',
      nboccch: 'NB_OCC_CH',
      children: 'NB_OCC_CH',
      enfants: 'NB_OCC_CH',
      child: 'NB_OCC_CH',
      pserdate: 'PSER_DATE',
      arrivaldate: 'PSER_DATE',
      datearr: 'PSER_DATE',
      date: 'PSER_DATE'
    };
    return map[normalized] || String(header || '').replace(/^﻿/, '').trim();
  }

  function normalizeImportedArrivalRow(row){
    const normalized = {};
    Object.entries(row || {}).forEach(([key, value]) => {
      const canonicalKey = canonicalArrivalKey(key);
      if (!canonicalKey) return;
      normalized[canonicalKey] = value == null ? '' : String(value).trim();
    });
    return normalized;
  }

  function parsePlanOccupancyInt(value){
    const cleaned = String(value == null ? '' : value).replace(/[^0-9-]/g, '').trim();
    if (!cleaned) return 0;
    const num = parseInt(cleaned, 10);
    return Number.isFinite(num) ? num : 0;
  }

  function extractArrivalsReferenceDate(file, parsed){
    const filename = String(file?.name || '');
    const fromName = filename.match(/(20\d{2})(\d{2})(\d{2})/);
    if (fromName) return `${fromName[1]}-${fromName[2]}-${fromName[3]}`;
    const rows = Array.isArray(parsed?.rows) ? parsed.rows : [];
    const counts = new Map();
    rows.forEach((rawRow) => {
      const row = normalizeImportedArrivalRow(rawRow);
      const key = toUtcDayKey(parseFrLikeDate(row.PSER_DATE));
      if (!key) return;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    let bestKey = '';
    let bestCount = -1;
    counts.forEach((count, key) => {
      if (count > bestCount) {
        bestKey = key;
        bestCount = count;
      }
    });
    return bestKey || toUtcDayKey(new Date());
  }

  function buildArrivalsRequirementsFromRows(rows){
    const requirements = {};
    const sofaRules = getPlanSofaRules();
    let arrivals = 0;
    let matched = 0;
    let sofaRooms = 0;
    (Array.isArray(rows) ? rows : []).forEach((originalRow) => {
      const row = normalizeImportedArrivalRow(originalRow);
      const roomType = normalizePlanArrivalRoomType(row.ROOM_TYPE || row.RoomType || row.roomType || '');
      const adu = parsePlanOccupancyInt(row.NB_OCC_AD);
      const enf = parsePlanOccupancyInt(row.NB_OCC_CH);
      if (!roomType) return;
      arrivals += 1;
      matched += 1;
      const sofaKey = `${adu}A+${enf}E`;
      const sofaNeed = String(sofaRules[sofaKey] || '0');
      if (sofaNeed === '1' || sofaNeed === '2') {
        requirements[roomType] = Number(requirements[roomType] || 0) + 1;
        sofaRooms += 1;
      }
    });
    return { requirements, arrivals, matched, sofaRooms };
  }

  function applyArrivalsImportFromText(raw, file){
    const parsed = parseDelimitedTable(raw);
    if (!parsed.rows.length) return 0;
    const summary = buildArrivalsRequirementsFromRows(parsed.rows);
    state.arrivalsRequirements = { ...summary.requirements };
    state.arrivalsMeta = {
      name: String(file?.name || ''),
      ts: new Date().toISOString(),
      size: Number(file?.size || 0),
      rows: parsed.rows.length,
      matched: summary.matched,
      arrivals: summary.arrivals,
      sofaRooms: summary.sofaRooms,
      referenceDate: extractArrivalsReferenceDate(file, parsed)
    };
    persistPlanOperationalInputs();
    refreshOperationalInputsUi();
    renderPlanTypeBalance();
    return summary.matched;
  }

  function getRoomStateReferenceDate(){
    const raw = String(state?.roomStateMeta?.referenceDate || '').trim();
    const parsed = raw ? parseFrLikeDate(raw.replace(/-/g, '/')) : null;
    if (parsed) return parsed;
    return new Date();
  }

  function normalizeLooseKey(value){
    return String(value || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim()
      .toLowerCase();
  }

  function getPlanRoomMode(room){
    const roomStateKey = normalizeLooseKey(room?.roomState);
    if (roomStateKey === 'hors service') return 'blocked';
    const stayKey = normalizeLooseKey(room?.meta?.Stay || room?.Stay);
    const departure = parseFrLikeDate(room?.meta?.serv_date_end_cnv || room?.meta?.serv_date_end || '');
    const reference = getRoomStateReferenceDate();
    if (stayKey === 'present' && departure && departure.getTime() > reference.getTime()) return 'present';
    if (roomStateKey === 'libre') return 'free';
    return 'free';
  }

  function getPlanRoomModeClass(room){
    const mode = getPlanRoomMode(room);
    return mode ? `plan-mode-${mode}` : '';
  }

  function getPlanRoomModeLabel(room){
    const mode = getPlanRoomMode(room);
    if (mode === 'blocked') return 'Bloqué';
    if (mode === 'present') return 'Présent';
    return 'Libérable';
  }

  function safeJsonParse(raw, fallback){
    try { return JSON.parse(raw); } catch { return fallback; }
  }

  function loadCrossedEquipment(){
    const saved = safeJsonParse(localStorage.getItem(LS_PLAN_CROSSED_EQUIPMENT) || 'null', null);
    if (!Array.isArray(saved)) return new Set();
    return new Set(saved.map(value => String(value || '').trim()).filter(Boolean));
  }

  function saveCrossedEquipment(){
    localStorage.setItem(LS_PLAN_CROSSED_EQUIPMENT, JSON.stringify([...state.crossedEquipmentRooms]));
  }

  function isEquipmentCrossed(roomNum){
    return state.crossedEquipmentRooms.has(String(roomNum || '').trim());
  }

  function toggleEquipmentCrossed(roomNum){
    const key = String(roomNum || '').trim();
    if (!key) return;
    if (state.crossedEquipmentRooms.has(key)) state.crossedEquipmentRooms.delete(key);
    else state.crossedEquipmentRooms.add(key);
    saveCrossedEquipment();
    renderBoards();
    renderInspector();
  }

  function loadManualSofaRooms(){
    const saved = safeJsonParse(localStorage.getItem(LS_PLAN_MANUAL_SOFA_ROOMS) || 'null', null);
    if (!Array.isArray(saved)) return new Set();
    return new Set(saved.map(value => String(value || '').trim()).filter(Boolean));
  }

  function saveManualSofaRooms(){
    localStorage.setItem(LS_PLAN_MANUAL_SOFA_ROOMS, JSON.stringify([...state.manualSofaRooms]));
  }

  function loadVisualFilters(){
    const defaults = { night: true, opened: true, toOpen: true, closed: true };
    const saved = safeJsonParse(localStorage.getItem(LS_PLAN_VISUAL_FILTERS) || 'null', null);
    if (!saved || typeof saved !== 'object') return defaults;
    return {
      night: saved.night !== false,
      opened: saved.opened !== false,
      toOpen: saved.toOpen !== false,
      closed: saved.closed !== false
    };
  }

  function loadPlanSectionCollapse(){
    const defaults = { settings: false, inspector: false };
    const saved = safeJsonParse(localStorage.getItem(LS_PLAN_SECTION_COLLAPSE) || 'null', null);
    if (!saved || typeof saved !== 'object') return defaults;
    return {
      settings: saved.settings === true,
      inspector: saved.inspector === true
    };
  }

  function setPlanSectionState(sectionEl, collapsed){
    if (!sectionEl) return;
    const body = sectionEl.querySelector('[data-plan-section-body]');
    const btn = sectionEl.querySelector('[data-plan-section-toggle]');
    sectionEl.classList.toggle('is-collapsed', !!collapsed);
    if (body) body.style.display = collapsed ? 'none' : '';
    if (btn) {
      btn.textContent = collapsed ? '+' : '−';
      btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      btn.title = collapsed ? 'Déployer' : 'Réduire';
    }
  }

  function syncPlanSectionUi(){
    document.querySelectorAll('[data-plan-section-id]').forEach(sectionEl => {
      const key = String(sectionEl.getAttribute('data-plan-section-id') || '').trim();
      if (!key) return;
      setPlanSectionState(sectionEl, !!state.planSections?.[key]);
    });
  }

  function hasManualSofa(roomNum){
    return state.manualSofaRooms.has(String(roomNum || '').trim());
  }

  function toggleManualSofa(roomNum){
    const key = String(roomNum || '').trim();
    if (!key) return;
    const room = (state.rooms || []).find(item => String(item?.room_num || '').trim() === key) || null;
    const lockedByDetected = !!(room && roomHasEquipmentWrench(room));
    const lockedByNight = getNightInputSet().has(key);
    if (lockedByDetected || lockedByNight) {
      if (state.manualSofaRooms.has(key)) {
        state.manualSofaRooms.delete(key);
        saveManualSofaRooms();
        renderBoards();
        renderInspector();
      }
      return;
    }
    if (state.manualSofaRooms.has(key)) state.manualSofaRooms.delete(key);
    else state.manualSofaRooms.add(key);
    saveManualSofaRooms();
    renderBoards();
    renderInspector();
  }

  function roomFloorLabel(room){
    const raw = String(room?.floor || '').trim();
    if (raw) return raw;
    const n = parseInt(String(room?.room_num || '').match(/\d+/)?.[0] || '', 10);
    const hundred = Number.isFinite(n) ? Math.floor(n / 100) : 1;
    if (hundred <= 1) return 'Étage 1';
    return `Étage ${hundred}`;
  }

  function floorRank(label){
    const m = String(label || '').match(/(\d+)/);
    return m ? Number(m[1]) : 0;
  }

  function getFloorOrder(rooms){
    const labels = Array.from(new Set((rooms || []).map(roomFloorLabel)));
    return labels.sort((a,b)=> floorRank(b) - floorRank(a));
  }

  function defaultLaneHeights(){
    const out = { ...DEFAULT_LANE_HEIGHTS };
    getFloorOrder(DEFAULT_ROOMS).forEach(label => { if (!out[label]) out[label] = 280; });
    return out;
  }

  function loadLaneHeights(){
    const saved = safeJsonParse(localStorage.getItem(LS_PLAN_LANE_HEIGHTS) || 'null', null);
    return { ...defaultLaneHeights(), ...(saved || {}) };
  }

  function saveLaneHeights(state){
    localStorage.setItem(LS_PLAN_LANE_HEIGHTS, JSON.stringify(state.laneHeights || {}));
  }

  function cloneDefaultRooms(){
    return DEFAULT_ROOMS.map(room => ({ ...room, floor: roomFloorLabel(room), meta: { ...(room.meta || {}) } }));
  }

  function roomGridCol(room){
    const raw = Number(room?.gridCol);
    if (Number.isFinite(raw)) return Math.max(0, Math.round(raw));
    const x = Number(room?.x);
    if (Number.isFinite(x)) return Math.max(0, Math.round((x - PLAN_PADDING_X) / LEGACY_SOURCE_COL_STEP));
    return 0;
  }

  function roomGridRow(room){
    const raw = Number(room?.gridRow);
    if (Number.isFinite(raw)) return Math.max(0, Math.round(raw));
    const y = Number(room?.y);
    if (Number.isFinite(y)) return Math.max(0, Math.round((y - PLAN_PADDING_Y) / LEGACY_SOURCE_ROW_STEP));
    return 0;
  }

  function roomPixelX(room){
    return PLAN_PADDING_X + roomGridCol(room) * currentColStep();
  }

  function roomPixelY(room){
    return PLAN_PADDING_Y + roomGridRow(room) * currentRowStep();
  }

  function syncRoomPixelPosition(room){
    room.gridCol = roomGridCol(room);
    room.gridRow = roomGridRow(room);
    room.x = PLAN_PADDING_X + room.gridCol * BASE_COL_STEP;
    room.y = PLAN_PADDING_Y + room.gridRow * BASE_ROW_STEP;
    return room;
  }

  function sanitizeRoom(room){
    const next = { ...room, floor: roomFloorLabel(room), meta: { ...(room.meta || {}) } };
    next.locked = !!next.locked;
    return syncRoomPixelPosition(next);
  }

  function loadRooms(){
    const saved = safeJsonParse(localStorage.getItem(LS_PLAN_LAYOUT) || 'null', null);
    const rooms = Array.isArray(saved) && saved.length ? saved.map(sanitizeRoom) : cloneDefaultRooms().map(sanitizeRoom);
    localStorage.setItem(LS_PLAN_LAYOUT_VERSION, PLAN_LAYOUT_VERSION);
    return rooms;
  }

  function saveRooms(state){
    localStorage.setItem(LS_PLAN_LAYOUT, JSON.stringify((state.rooms || []).map(sanitizeRoom)));
    localStorage.setItem(LS_PLAN_LAYOUT_VERSION, PLAN_LAYOUT_VERSION);
  }

  function sanitizeElevator(elevator){
    const next = { ...(elevator || {}) };
    next.id = String(next.id || 'lift');
    next.name = String(next.name || 'Ascenseur A1');
    next.shortLabel = String(next.shortLabel || next.name || 'A');
    next.x = Number.isFinite(Number(next.x)) ? Number(next.x) : 780;
    next.y = Number.isFinite(Number(next.y)) ? Number(next.y) : 44;
    return next;
  }

  function defaultElevators(){
    return DEFAULT_ELEVATORS.map(sanitizeElevator);
  }

  function loadElevators(){
    const saved = safeJsonParse(localStorage.getItem(LS_PLAN_ELEVATORS) || 'null', null);
    if (!Array.isArray(saved) || !saved.length) return defaultElevators();
    const fallback = new Map(defaultElevators().map(item => [item.id, item]));
    const merged = Array.from(fallback.values()).map(base => {
      const match = saved.find(item => String(item?.id) === String(base.id));
      return sanitizeElevator(match ? { ...base, ...match } : base);
    });
    saved.forEach(item => {
      const id = String(item?.id || '');
      if (!id || fallback.has(id)) return;
      merged.push(sanitizeElevator(item));
    });
    return merged;
  }

  function saveElevators(state){
    localStorage.setItem(LS_PLAN_ELEVATORS, JSON.stringify((state.elevators || []).map(sanitizeElevator)));
  }

  const state = {
    rooms: [],
    elevators: loadElevators(),
    search: '',
    floors: [],
    selectedRoom: '',
    laneHeights: loadLaneHeights(),
    allLocked: localStorage.getItem(LS_PLAN_GLOBAL_LOCK) === '1',
    blockScale: Math.min(1.10, Math.max(0.35, Number(localStorage.getItem(LS_PLAN_BLOCK_SCALE) || '1') || 1)),
    roomStateMeta: safeJsonParse(localStorage.getItem(LS_PLAN_ROOMSTATE_META), null),
    arrivalsMeta: safeJsonParse(localStorage.getItem(LS_PLAN_ARRIVALS_META), null),
    arrivalsRequirements: loadArrivalsRequirements(),
    nightInput: String(localStorage.getItem(LS_PLAN_NIGHT_INPUT) || ''),
    fadeNonActionable: localStorage.getItem(LS_PLAN_FADE_NON_ACTIONABLE) === '1',
    fadeOpacity: Math.min(1, Math.max(0, Number(localStorage.getItem(LS_PLAN_FADE_OPACITY) || '0.22') || 0.22)),
    crossedEquipmentRooms: loadCrossedEquipment(),
    manualSofaRooms: loadManualSofaRooms(),
    visualFilters: loadVisualFilters(),
    countMode: ['detail','simple','off'].includes(localStorage.getItem(LS_PLAN_COUNT_MODE) || '') ? localStorage.getItem(LS_PLAN_COUNT_MODE) : 'detail',
    listVisible: localStorage.getItem(LS_PLAN_LIST_VISIBLE) !== '0',
    listCompact: localStorage.getItem(LS_PLAN_LIST_COMPACT) === '1',
    planSections: loadPlanSectionCollapse(),
    bound: false
  };

  function currentRoomWidth(){ return Math.round(BASE_ROOM_WIDTH * state.blockScale); }
  function currentRoomHeight(){ return Math.round(BASE_ROOM_HEIGHT * state.blockScale); }
  function currentColStep(){ return Math.round(BASE_COL_STEP * state.blockScale); }
  function currentRowStep(){ return Math.round(BASE_ROW_STEP * state.blockScale); }
  function saveGlobalPlanUi(){
    localStorage.setItem(LS_PLAN_GLOBAL_LOCK, state.allLocked ? '1' : '0');
    localStorage.setItem(LS_PLAN_BLOCK_SCALE, String(state.blockScale));
    localStorage.setItem(LS_PLAN_FADE_NON_ACTIONABLE, state.fadeNonActionable ? '1' : '0');
    localStorage.setItem(LS_PLAN_FADE_OPACITY, String(state.fadeOpacity));
    localStorage.setItem(LS_PLAN_VISUAL_FILTERS, JSON.stringify(state.visualFilters || {}));
    localStorage.setItem(LS_PLAN_COUNT_MODE, String(state.countMode || 'detail'));
    localStorage.setItem(LS_PLAN_LIST_VISIBLE, state.listVisible ? '1' : '0');
    localStorage.setItem(LS_PLAN_LIST_COMPACT, state.listCompact ? '1' : '0');
    localStorage.setItem(LS_PLAN_SECTION_COLLAPSE, JSON.stringify(state.planSections || {}));
  }

  function getVisibleFloors(){
    const floors = getFloorOrder(state.rooms);
    const selected = Array.isArray(state.floors) ? state.floors.filter(label => floors.includes(label)) : [];
    return selected.length ? selected : floors;
  }

  function getFilteredRooms(){
    const visible = new Set(getVisibleFloors());
    return state.rooms.filter(room => visible.has(roomFloorLabel(room)));
  }

  function normalizePlanRoomType(value){
    const raw = String(value || '').trim().toUpperCase();
    if (raw === 'PRIMV') return 'PRIVM';
    return raw;
  }

  function getPlanTypeOrder(){
    return ['TRI', 'STDM', 'PRIVS', 'PRIVM', 'SGE', 'EXEC'];
  }

  function buildPlanTypeBalance(){
    const visibleRooms = getFilteredRooms();
    const visibleSet = new Set(visibleRooms.map(room => String(room.room_num)));
    const crossedSet = new Set([...state.crossedEquipmentRooms].filter(roomNum => visibleSet.has(String(roomNum))));
    const nightSet = new Set([...getNightInputSet()].filter(roomNum => visibleSet.has(String(roomNum))));
    const manualSet = new Set([...state.manualSofaRooms].filter(roomNum => visibleSet.has(String(roomNum))));
    const baselineSet = new Set(
      visibleRooms
        .filter(room => roomHasEquipmentWrench(room))
        .map(room => String(room.room_num))
    );
    const currentSet = new Set(
      [...nightSet, ...baselineSet, ...manualSet].filter(roomNum => !crossedSet.has(String(roomNum)))
    );
    const roomMap = new Map(visibleRooms.map(room => [String(room.room_num), room]));
    const counters = new Map(getPlanTypeOrder().map(type => [type, { type, current: 0, minimum: 0 }]));
    Object.entries(state.arrivalsRequirements || {}).forEach(([roomType, count]) => {
      const type = normalizePlanRoomType(roomType);
      if (!counters.has(type)) counters.set(type, { type, current: 0, minimum: 0 });
      counters.get(type).minimum += Math.max(0, Number(count || 0) || 0);
    });
    currentSet.forEach(roomNum => {
      const room = roomMap.get(String(roomNum));
      const mode = getPlanRoomMode(room);
      if (mode === 'blocked' || mode === 'present') return;
      const type = normalizePlanRoomType(room?.roomType);
      if (!counters.has(type)) counters.set(type, { type, current: 0, minimum: 0 });
      counters.get(type).current += 1;
    });
    return {
      rows: Array.from(counters.values()),
      roomMap,
      currentSet,
      nightSet,
      crossedSet
    };
  }

  function renderPlanTypeBalance(){
    const host = byId('plan-type-balance');
    const listHost = byId('plan-open-list');
    if (!host) return;
    const balance = buildPlanTypeBalance();
    const rows = balance.rows;
    host.innerHTML = '';
    host.classList.toggle('is-hidden', state.countMode === 'off');
    if (state.countMode !== 'off') {
      rows.forEach(row => {
        const pill = document.createElement('div');
        const delta = row.current - row.minimum;
        const isAbove = delta > 0;
        const isBelow = delta < 0;
        const deltaText = delta > 0 ? `(+${delta})` : delta < 0 ? `(${delta})` : '(0)';
        pill.className = `plan-type-balance-pill${isAbove ? ' is-covered' : ''}${isBelow ? ' is-short' : ''}`;
        const ratioInner = state.countMode === 'simple'
          ? `<span class="plan-type-balance-current">${row.current}</span><span class="plan-type-balance-sep">/</span><span class="plan-type-balance-min">${row.minimum}</span>`
          : `<span class="plan-type-balance-current">${row.current}</span><span class="plan-type-balance-sep">/</span><span class="plan-type-balance-min">${row.minimum}</span><span class="plan-type-balance-delta">${deltaText}</span>`;
        pill.innerHTML = `<span class="plan-type-balance-code">${row.type}</span><span class="plan-type-balance-ratio">${ratioInner}</span>`;
        pill.title = `${row.type} · actuel ${row.current} · besoin minimal ${row.minimum} · écart ${delta > 0 ? '+' : ''}${delta}`;
        host.appendChild(pill);
      });
    }

    if (!listHost) return;
    listHost.classList.toggle('is-hidden', !state.listVisible);
    listHost.classList.toggle('is-compact', !!state.listCompact);
    if (!state.listVisible) {
      listHost.innerHTML = '';
      return;
    }
    const currentRooms = [...balance.currentSet]
      .map(roomNum => balance.roomMap.get(String(roomNum)))
      .filter(Boolean)
      .filter(room => !balance.nightSet.has(String(room.room_num)))
      .filter(room => getPlanRoomMode(room) === 'free')
      .sort((a, b) => Number(a.room_num) - Number(b.room_num));
    const roomLabels = currentRooms.map(room => String(room.room_num));
    if (!roomLabels.length) {
      listHost.innerHTML = '<div class="plan-open-list-title">Liste des sofa à ouvrir</div><div class="plan-open-list-empty">Aucune chambre sélectionnée.</div>';
      return;
    }
    const groupedRooms = new Map();
    currentRooms.forEach((room)=>{
      const roomNum = String(room.room_num || '').trim();
      const floorKey = roomNum ? `${roomNum.charAt(0)}00` : 'Autres';
      if (!groupedRooms.has(floorKey)) groupedRooms.set(floorKey, []);
      groupedRooms.get(floorKey).push(roomNum);
    });
    const groupHtml = [...groupedRooms.entries()]
      .map(([floorKey, rooms]) => `<div class="plan-open-list-group"><span class="plan-open-list-rooms">${rooms.join(' · ')}</span></div>`)
      .join('');
    listHost.innerHTML = `<div class="plan-open-list-title">Liste des sofa à ouvrir</div>${groupHtml}`;
  }



  function parseDelimitedLine(line, separator){
    const out = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (ch === separator && !inQuotes) {
        out.push(cur);
        cur = '';
        continue;
      }
      cur += ch;
    }
    out.push(cur);
    return out.map(value => String(value || '').replace(/﻿/g, '').trim());
  }

  function detectDelimitedSeparator(firstLine){
    const line = String(firstLine || '');
    const candidates = [';', ',', '\t'];
    let best = ';';
    let bestScore = -1;
    candidates.forEach(separator => {
      const score = parseDelimitedLine(line, separator).length;
      if (score > bestScore) {
        best = separator;
        bestScore = score;
      }
    });
    return best;
  }

  function parseDelimitedTable(raw, forcedSeparator){
    const lines = String(raw || '')
      .replace(/^﻿/, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map(line => line.trimEnd())
      .filter(Boolean);
    if (!lines.length) return { headers: [], rows: [], separator: forcedSeparator || ';' };
    const separator = forcedSeparator || detectDelimitedSeparator(lines[0]);
    const rawHeaders = parseDelimitedLine(lines[0], separator);
    const headers = rawHeaders.map(header => String(header || '').replace(/^﻿/, '').trim());
    const rows = lines.slice(1).map(line => {
      const cells = parseDelimitedLine(line, separator);
      const row = {};
      headers.forEach((header, index) => {
        row[header] = String(cells[index] || '').trim().replace(/^"(.*)"$/, '$1');
      });
      return row;
    }).filter(row => Object.values(row).some(Boolean));
    return { headers, rows, separator };
  }

  function normalizeImportHeader(header){
    return String(header || '')
      .replace(/^﻿/, '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');
  }

  function normalizeRoomNumber(value){
    const digits = String(value == null ? '' : value).replace(/\D+/g, '');
    if (!digits) return '';
    return String(parseInt(digits, 10));
  }

  function canonicalRoomStateKey(header){
    const normalized = normalizeImportHeader(header);
    const map = {
      roomnum: 'room_num',
      roomnumber: 'room_num',
      roomno: 'room_num',
      room: 'room_num',
      roomid: 'room_id',
      guestname: 'GUES_NAME',
      guestfirstname: 'GUES_FIRSTNAME',
      guesname: 'GUES_NAME',
      guesfirstname: 'GUES_FIRSTNAME',
      servdatestartcnv: 'serv_date_start_cnv',
      servdateendcnv: 'serv_date_end_cnv',
      servdatestart: 'serv_date_start',
      servdateend: 'serv_date_end',
      roomtype: 'RoomType',
      roomstate: 'RoomState',
      etat: 'Etat',
      stay: 'Stay',
      clstid: 'CLST_ID',
      remarque: 'remarque',
      ppostpayment: 'pPostPayment',
      accesscontroltype: 'AccessControlType',
      menage: 'menage',
      roomminmainstatus: 'ROOM_MINMAIN_STATUS',
      minmainreason: 'MinMainReason',
      minmaincomment: 'MinMainComment',
      adults: 'Adults',
      children: 'Children',
      arrivalhour: 'ArrivalHour',
      departurehour: 'DepartureHour',
      occnb: 'occ_nb',
      nbr: 'NBr',
      bookid: 'book_id',
      servid: 'serv_id',
      rstaid: 'rsta_id',
      guesid: 'gues_id',
      cocacurrentcode: 'coca_current_code'
    };
    return map[normalized] || String(header || '').replace(/^﻿/, '').trim();
  }

  function normalizeImportedRoomStateRow(row){
    const normalized = {};
    Object.entries(row || {}).forEach(([key, value]) => {
      const canonicalKey = canonicalRoomStateKey(key);
      if (!canonicalKey) return;
      normalized[canonicalKey] = value == null ? '' : String(value).trim();
    });
    return normalized;
  }

  function cleanImportedMetaRow(row){
    const meta = {};
    Object.entries(row || {}).forEach(([key, value]) => {
      if (!key) return;
      const nextValue = value == null ? '' : String(value).trim();
      if (!nextValue) return;
      meta[key] = nextValue;
    });
    return meta;
  }

  function getStaticRoomMetaBaseline(meta){
    const source = meta && typeof meta === 'object' ? meta : {};
    const allowedKeys = new Set(['room_id', 'AccessControlType']);
    const next = {};
    Object.entries(source).forEach(([key, value]) => {
      if (!allowedKeys.has(String(key || '').trim())) return;
      const cleanValue = value == null ? '' : String(value).trim();
      if (!cleanValue) return;
      next[key] = cleanValue;
    });
    return next;
  }

  function resetRoomsToBaselineBeforeRoomStateImport(){
    const defaultRoomMap = new Map(cloneDefaultRooms().map(room => [normalizeRoomNumber(room.room_num), room]));
    (state.rooms || []).forEach(room => {
      const baseline = defaultRoomMap.get(normalizeRoomNumber(room.room_num));
      if (!baseline) return;
      room.roomType = String(baseline.roomType || room.roomType || '').trim();
      room.roomState = '';
      room.etat = '';
      room.meta = getStaticRoomMetaBaseline(baseline.meta);
    });
  }

  function resetDerivedPlanStateAfterRoomStateImport(){
    state.selectedRoom = '';
    state.crossedEquipmentRooms = new Set();
    state.manualSofaRooms = new Set();
    state.nightInput = '';
    saveCrossedEquipment();
    saveManualSofaRooms();
  }

  function applyRoomStateImportFromText(raw, file){
    const parsed = parseDelimitedTable(raw);
    if (!parsed.rows.length) return 0;
    const roomMap = new Map((state.rooms || []).map(room => [normalizeRoomNumber(room.room_num), room]));
    const referenceDate = extractRoomStateReferenceDate(file, parsed);
    resetRoomsToBaselineBeforeRoomStateImport();
    resetDerivedPlanStateAfterRoomStateImport();
    let matched = 0;
    parsed.rows.forEach(originalRow => {
      const row = normalizeImportedRoomStateRow(originalRow);
      const roomNum = normalizeRoomNumber(row.room_num);
      if (!roomNum) return;
      const target = roomMap.get(roomNum);
      if (!target) return;
      matched += 1;
      const importedMeta = cleanImportedMetaRow(row);
      target.meta = { ...(target.meta || {}), ...importedMeta };
      if (row.RoomType) target.roomType = String(row.RoomType).trim();
      if (row.RoomState) target.roomState = String(row.RoomState).trim();
      if (row.Etat) target.etat = String(row.Etat).trim();
      target.room_num = String(target.room_num || roomNum);
    });
    saveRooms(state);
    state.roomStateMeta = {
      name: String(file?.name || ''),
      ts: new Date().toISOString(),
      size: Number(file?.size || 0),
      rows: parsed.rows.length,
      matched,
      referenceDate
    };
    persistPlanOperationalInputs();
    renderInspector();
    renderBoards();
    refreshOperationalInputsUi();
    return matched;
  }

  function detailLabel(label){
    const map = {
      GUES_NAME: 'Nom',
      GUES_FIRSTNAME: 'Prénom',
      serv_date_start_cnv: 'Arrivée',
      serv_date_end_cnv: 'Départ',
      Stay: 'Séjour',
      remarque: 'Remarque',
      menage: 'Ménage',
      Adults: 'Adultes',
      Children: 'Enfants',
      ArrivalHour: 'Heure arrivée',
      DepartureHour: 'Heure départ',
      ROOM_MINMAIN_STATUS: 'ROOM_MINMAIN_STATUS',
      MinMainReason: 'MinMainReason',
      MinMainComment: 'MinMainComment'
    };
    return map[label] || label;
  }

  function formatImportMeta(meta){
    if (!meta) return '—';
    if (meta.ts) {
      const date = new Date(meta.ts);
      if (!Number.isNaN(date.getTime())) {
        const day = date.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'2-digit' });
        const time = date.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
        return `${day} · ${time}`;
      }
    }
    if (meta.referenceDate) {
      return String(meta.referenceDate).split('-').reverse().join('/');
    }
    return 'Importé';
  }

  function persistPlanOperationalInputs(){
    if (state.roomStateMeta) localStorage.setItem(LS_PLAN_ROOMSTATE_META, JSON.stringify(state.roomStateMeta));
    else localStorage.removeItem(LS_PLAN_ROOMSTATE_META);
    if (state.arrivalsMeta) localStorage.setItem(LS_PLAN_ARRIVALS_META, JSON.stringify(state.arrivalsMeta));
    else localStorage.removeItem(LS_PLAN_ARRIVALS_META);
    if (state.arrivalsRequirements && Object.keys(state.arrivalsRequirements).length) localStorage.setItem(LS_PLAN_ARRIVALS_REQUIREMENTS, JSON.stringify(state.arrivalsRequirements));
    else localStorage.removeItem(LS_PLAN_ARRIVALS_REQUIREMENTS);
    localStorage.setItem(LS_PLAN_NIGHT_INPUT, state.nightInput || '');
  }

  function getNightInputTokens(){
    return String(state.nightInput || '')
      .split(/[\s,;]+/)
      .map(value => value.trim())
      .filter(Boolean)
      .map(value => value.replace(/[^0-9]/g, ''))
      .filter(Boolean);
  }

  function getNightInputSet(){
    return new Set(getNightInputTokens());
  }

  function refreshOperationalInputsUi(){
    const roomStateDate = byId('plan-roomstate-date');
    const arrivalsDate = byId('plan-arrivals-date');
    const nightTextarea = byId('plan-night-rooms-input');
    const nightStatus = byId('plan-night-status');
    if (roomStateDate) roomStateDate.textContent = formatImportMeta(state.roomStateMeta);
    if (arrivalsDate) arrivalsDate.textContent = formatImportMeta(state.arrivalsMeta);
    if (nightTextarea && nightTextarea.value !== state.nightInput) nightTextarea.value = state.nightInput;
    if (nightStatus) {
      const tokens = getNightInputTokens();
      const uniqueTokens = [...new Set(tokens)];
      const existingRooms = new Set((state.rooms || []).map(room => String(room?.room_num || '').trim()));
      const matched = uniqueTokens.filter(roomNum => existingRooms.has(roomNum)).length;
      const missing = uniqueTokens.length - matched;
      if (!uniqueTokens.length) {
        nightStatus.textContent = 'Aucune saisie';
      } else {
        const parts = [
          `${uniqueTokens.length} chambre${uniqueTokens.length > 1 ? 's' : ''}`,
          `${matched} sur plan`
        ];
        if (missing > 0) parts.push(`${missing} introuvable${missing > 1 ? 's' : ''}`);
        nightStatus.textContent = parts.join(' • ');
      }
    }
  }

  function bindOperationalImportStrip(stripId, triggerId, inputId, stateKey){
    const strip = byId(stripId);
    const trigger = byId(triggerId);
    const input = byId(inputId);
    if (!strip || !input) return;
    const openPicker = ()=> input.click();
    const setActive = (value)=> strip.classList.toggle('is-drag-active', !!value);

    const handleFile = (file)=>{
      if (!file) return;
      if (stateKey === 'roomStateMeta') {
        const reader = new FileReader();
        reader.onload = ()=>{
          try {
            const matched = applyRoomStateImportFromText(String(reader.result || ''), file);
            if (!matched) alert('Import Room State : aucune chambre reconnue dans le fichier.');
          } catch (_) {
            alert('Import Room State invalide');
          }
        };
        reader.readAsText(file, 'utf-8');
        return;
      }
      if (stateKey === 'arrivalsMeta') {
        const reader = new FileReader();
        reader.onload = ()=>{
          try {
            const matched = applyArrivalsImportFromText(String(reader.result || ''), file);
            if (!matched) alert('Import Arrivées : aucune arrivée exploitable reconnue dans le fichier.');
          } catch (_) {
            alert('Import Arrivées invalide');
          }
        };
        reader.readAsText(file, 'utf-8');
        return;
      }
      state[stateKey] = { name: String(file.name || ''), ts: new Date().toISOString(), size: Number(file.size || 0) };
      persistPlanOperationalInputs();
      refreshOperationalInputsUi();
    };

    strip.addEventListener('click', (e)=>{
      if (e.target?.closest?.(`#${triggerId}`)) return;
      openPicker();
    });
    strip.addEventListener('keydown', (e)=>{
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openPicker();
      }
    });
    trigger?.addEventListener('click', (e)=>{
      e.preventDefault();
      e.stopPropagation();
      openPicker();
    });
    ['dragenter','dragover'].forEach(evt=> strip.addEventListener(evt, (e)=>{ e.preventDefault(); setActive(true); }));
    ['dragleave','dragend'].forEach(evt=> strip.addEventListener(evt, ()=> setActive(false)));
    strip.addEventListener('drop', (e)=>{
      e.preventDefault();
      setActive(false);
      handleFile((e.dataTransfer?.files || [])[0]);
    });
    input.addEventListener('change', (e)=>{
      handleFile((e.target.files || [])[0]);
      input.value = '';
    });
  }

  function buildPlanExportPayload(){
    return {
      version: PLAN_LAYOUT_VERSION,
      exported_at: new Date().toISOString(),
      allLocked: !!state.allLocked,
      blockScale: state.blockScale,
      crossedEquipmentRooms: [...state.crossedEquipmentRooms],
      manualSofaRooms: [...state.manualSofaRooms],
      laneHeights: { ...(state.laneHeights || {}) },
      elevators: (state.elevators || []).map(elevator => sanitizeElevator(elevator)),
      rooms: (state.rooms || []).map(room => sanitizeRoom(room))
    };
  }

  function downloadPlanJson(){
    const payload = buildPlanExportPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0,19).replace(/[T:]/g, '-');
    a.href = URL.createObjectURL(blob);
    a.download = `${LS_PLAN_EXPORT_NAME}_${stamp}.json`;
    a.click();
    setTimeout(()=> URL.revokeObjectURL(a.href), 1000);
    const status = byId('plan-json-status');
    if (status) status.textContent = 'Export JSON effectué';
  }

  function importPlanJson(file){
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      try {
        const parsed = safeJsonParse(String(reader.result || ''), null);
        if (!parsed || !Array.isArray(parsed.rooms)) throw new Error('invalid_json');
        state.rooms = parsed.rooms.map(sanitizeRoom);
        state.laneHeights = { ...defaultLaneHeights(), ...((parsed.laneHeights && typeof parsed.laneHeights === 'object') ? parsed.laneHeights : {}) };
        state.elevators = Array.isArray(parsed.elevators) && parsed.elevators.length ? parsed.elevators.map(sanitizeElevator) : defaultElevators();
        state.allLocked = !!parsed.allLocked;
        const nextScale = Number(parsed.blockScale);
        state.blockScale = Math.min(1.10, Math.max(0.35, Number.isFinite(nextScale) ? nextScale : 1));
        const nextFadeOpacity = Number(parsed.fadeOpacity);
        state.fadeOpacity = Math.min(1, Math.max(0, Number.isFinite(nextFadeOpacity) ? nextFadeOpacity : state.fadeOpacity));
        state.crossedEquipmentRooms = Array.isArray(parsed.crossedEquipmentRooms) ? new Set(parsed.crossedEquipmentRooms.map(value => String(value || '').trim()).filter(Boolean)) : new Set();
        state.manualSofaRooms = Array.isArray(parsed.manualSofaRooms) ? new Set(parsed.manualSofaRooms.map(value => String(value || '').trim()).filter(Boolean)) : new Set();
        state.selectedRoom = '';
        state.floors = [];
        saveRooms(state);
        saveLaneHeights(state);
        saveElevators(state);
        saveGlobalPlanUi();
        saveCrossedEquipment();
        saveManualSofaRooms();
        fillFloorFilter();
        render();
        const status = byId('plan-json-status');
        if (status) status.textContent = 'Import JSON effectué';
      } catch (_) {
        const status = byId('plan-json-status');
        if (status) status.textContent = 'JSON invalide';
        alert('Fichier JSON du plan invalide');
      }
    };
    reader.readAsText(file);
  }

  function bindToolbar(){
    if (state.bound) return;
    state.bound = true;
    const floorFilterGroup = byId('plan-floor-filter-group');
    const floorFilterTrigger = byId('plan-floor-filter-trigger');
    const fadeToggle = byId('plan-fade-toggle');
    const fadeRange = byId('plan-fade-opacity');
    const exportBtn = byId('plan-export-json');
    const importInput = byId('plan-import-json-file');
    const lockBtn = byId('plan-toggle-lock');
    const sizeRange = byId('plan-block-size');
    const sizeValue = byId('plan-block-size-value');
    const nightTextarea = byId('plan-night-rooms-input');

    floorFilterTrigger?.addEventListener('click', (event)=>{
      event.preventDefault();
      floorFilterGroup?.classList.toggle('open');
      floorFilterTrigger.setAttribute('aria-expanded', floorFilterGroup?.classList.contains('open') ? 'true' : 'false');
    });
    fadeToggle?.addEventListener('click', ()=>{
      state.fadeNonActionable = !state.fadeNonActionable;
      saveGlobalPlanUi();
      syncPlanSettingsUi();
      renderBoards();
    });
    fadeRange?.addEventListener('input', ()=>{
      const next = Math.min(1, Math.max(0, (Number(fadeRange.value || '22') || 0) / 100));
      state.fadeOpacity = next;
      saveGlobalPlanUi();
      syncPlanSettingsUi();
      renderBoards();
    });
    const bindLayerToggle = (id, key)=>{
      const btn = byId(id);
      btn?.addEventListener('click', ()=>{
        state.visualFilters[key] = !state.visualFilters[key];
        saveGlobalPlanUi();
        syncPlanSettingsUi();
        renderBoards();
      });
    };
    bindLayerToggle('plan-toggle-night', 'night');
    bindLayerToggle('plan-toggle-opened', 'opened');
    bindLayerToggle('plan-toggle-to-open', 'toOpen');
    bindLayerToggle('plan-toggle-closed', 'closed');

    ['detail','simple','off'].forEach(mode => {
      const btn = byId(`plan-count-${mode}`);
      btn?.addEventListener('click', ()=>{
        state.countMode = mode;
        saveGlobalPlanUi();
        syncPlanSettingsUi();
        renderPlanTypeBalance();
      });
    });

    byId('plan-list-toggle')?.addEventListener('click', ()=>{
      state.listVisible = !state.listVisible;
      saveGlobalPlanUi();
      syncPlanSettingsUi();
      renderPlanTypeBalance();
    });
    byId('plan-list-compact')?.addEventListener('click', ()=>{
      state.listCompact = !state.listCompact;
      saveGlobalPlanUi();
      syncPlanSettingsUi();
      renderPlanTypeBalance();
    });
    document.querySelectorAll('[data-plan-section-toggle]').forEach(btn => {
      if (btn.dataset.bound === '1') return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', ()=>{
        const key = String(btn.getAttribute('data-plan-section-toggle') || '').trim();
        if (!key) return;
        state.planSections[key] = !state.planSections[key];
        saveGlobalPlanUi();
        syncPlanSectionUi();
      });
    });
    floorFilterGroup?.addEventListener('change', (event)=>{
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || target.name !== 'plan-floor-filter') return;
      const checked = Array.from(floorFilterGroup.querySelectorAll('input[name="plan-floor-filter"]:checked')).map(input => input.value);
      state.floors = checked;
      renderBoards();
      fillFloorFilter();
    });
    document.addEventListener('click', (event)=>{
      if (!floorFilterGroup) return;
      if (floorFilterGroup.contains(event.target)) return;
      floorFilterGroup.classList.remove('open');
      floorFilterTrigger?.setAttribute('aria-expanded', 'false');
    });
    lockBtn?.addEventListener('click', ()=>{
      state.allLocked = !state.allLocked;
      saveGlobalPlanUi();
      syncPlanSettingsUi();
      render();
    });
    sizeRange?.addEventListener('input', ()=>{
      const next = Math.min(1.10, Math.max(0.35, Number(sizeRange.value || '1') || 1));
      state.blockScale = next;
      saveGlobalPlanUi();
      if (sizeValue) sizeValue.textContent = `${Math.round(next * 100)}%`;
      renderBoards();
    });
    exportBtn?.addEventListener('click', downloadPlanJson);
    importInput?.addEventListener('change', (e)=>{
      importPlanJson(e.target?.files?.[0] || null);
      e.target.value = '';
    });
    nightTextarea?.addEventListener('input', ()=>{
      state.nightInput = nightTextarea.value || '';
      persistPlanOperationalInputs();
      refreshOperationalInputsUi();
      renderBoards();
      renderInspector();
    });
    bindOperationalImportStrip('plan-roomstate-strip', 'plan-roomstate-drop', 'plan-roomstate-file', 'roomStateMeta');
    bindOperationalImportStrip('plan-arrivals-strip', 'plan-arrivals-drop', 'plan-arrivals-file', 'arrivalsMeta');
    refreshOperationalInputsUi();
  }

  function syncPlanSettingsUi(){
    const lockBtn = byId('plan-toggle-lock');
    const sizeRange = byId('plan-block-size');
    const sizeValue = byId('plan-block-size-value');
    const fadeToggle = byId('plan-fade-toggle');
    const fadeRange = byId('plan-fade-opacity');
    const fadeValue = byId('plan-fade-opacity-value');
    if (lockBtn) lockBtn.textContent = state.allLocked ? 'Déverrouiller le plan' : 'Verrouiller le plan';
    if (sizeRange) sizeRange.value = String(state.blockScale);
    if (sizeValue) sizeValue.textContent = `${Math.round(state.blockScale * 100)}%`;
    if (fadeRange) fadeRange.value = String(Math.round(state.fadeOpacity * 100));
    if (fadeValue) fadeValue.textContent = `${Math.round(state.fadeOpacity * 100)}%`;
    if (fadeToggle) {
      fadeToggle.textContent = state.fadeNonActionable ? 'Focus sofa actif' : 'Focus sofa';
      fadeToggle.classList.toggle('is-active', !!state.fadeNonActionable);
      fadeToggle.setAttribute('aria-pressed', state.fadeNonActionable ? 'true' : 'false');
      fadeToggle.title = state.fadeNonActionable
        ? 'Présents et HS fondus'
        : 'Fondre les présents et les HS';
    }
    [
      ['plan-toggle-night', state.visualFilters?.night !== false],
      ['plan-toggle-opened', state.visualFilters?.opened !== false],
      ['plan-toggle-to-open', state.visualFilters?.toOpen !== false],
      ['plan-toggle-closed', state.visualFilters?.closed !== false],
      ['plan-list-toggle', !!state.listVisible],
      ['plan-list-compact', !!state.listCompact]
    ].forEach(([id, active])=>{
      const btn = byId(id);
      if (!btn) return;
      btn.classList.toggle('is-active', !!active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    ['detail','simple','off'].forEach(mode=>{
      const btn = byId(`plan-count-${mode}`);
      if (!btn) return;
      const active = state.countMode === mode;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    syncPlanSectionUi();
  }

  function fillFloorFilter(){
    const host = byId('plan-floor-filter-group');
    const menu = byId('plan-floor-filter-menu');
    const labelNode = byId('plan-floor-filter-label');
    const trigger = byId('plan-floor-filter-trigger');
    if (!host || !menu) return;
    const floors = getFloorOrder(state.rooms);
    const visibleFloors = getVisibleFloors();
    const selected = new Set(visibleFloors);
    menu.innerHTML = '';
    floors.forEach(label => {
      const item = document.createElement('label');
      item.className = 'plan-floor-filter-item' + (selected.has(label) ? ' is-active' : '');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.name = 'plan-floor-filter';
      input.value = label;
      input.checked = selected.has(label);
      const text = document.createElement('span');
      text.className = 'plan-floor-filter-item-label';
      text.textContent = label;
      item.append(input, text);
      menu.appendChild(item);
    });
    const allSelected = visibleFloors.length === floors.length;
    if (labelNode) {
      labelNode.textContent = allSelected
        ? 'Étages affichés'
        : `${visibleFloors.length} étage${visibleFloors.length > 1 ? 's' : ''} affiché${visibleFloors.length > 1 ? 's' : ''}`;
    }
    if (trigger) trigger.setAttribute('aria-expanded', host.classList.contains('open') ? 'true' : 'false');
  }

  function renderLaneControls(){
    const host = byId('plan-lane-controls');
    if (!host) return;
    host.innerHTML = '';
    getFloorOrder(state.rooms).forEach(label => {
      if (!state.laneHeights[label]) state.laneHeights[label] = 280;
      const item = document.createElement('div');
      item.className = 'plan-lane-control';
      const title = document.createElement('div');
      title.className = 'plan-lane-control-label';
      title.textContent = label;
      const input = document.createElement('input');
      input.type = 'range';
      input.min = '160';
      input.max = '520';
      input.step = '4';
      input.value = String(state.laneHeights[label]);
      const value = document.createElement('div');
      value.className = 'plan-lane-control-value';
      value.textContent = `${input.value}px`;
      input.addEventListener('input', ()=>{
        state.laneHeights[label] = Number(input.value);
        value.textContent = `${input.value}px`;
        saveLaneHeights(state);
      saveGlobalPlanUi();
        renderBoards();
      });
      item.append(title, input, value);
      host.appendChild(item);
    });
  }

  function getSelectedRoom(){
    return state.rooms.find(room => String(room.room_num) === String(state.selectedRoom)) || null;
  }

  function renderInspector(){
    const host = byId('plan-inspector');
    const stateLabel = byId('plan-inspector-state');
    if (!host) return;
    host.innerHTML = '';
    const room = getSelectedRoom();
    if (!room) {
      if (stateLabel) stateLabel.textContent = 'Aucune sélection';
      const empty = document.createElement('div');
      empty.className = 'plan-empty-state';
      empty.textContent = 'Sélectionne une chambre sur le plan pour afficher ses données internes.';
      host.appendChild(empty);
      return;
    }
    if (stateLabel) stateLabel.textContent = roomFloorLabel(room);
    const hero = document.createElement('div');
    hero.className = 'plan-detail-hero';
    hero.innerHTML = `<div class="plan-detail-room">${room.room_num}</div><div class="plan-detail-type">${room.roomType || '—'}</div><div class="plan-detail-badges"><span class="plan-pill">${roomFloorLabel(room)}</span><span class="plan-pill">${room.roomState || '—'}</span><span class="plan-pill">${room.etat || '—'}</span><span class="plan-pill">${state.allLocked ? 'Plan verrouillé' : 'Plan modifiable'}</span></div>`;
    host.appendChild(hero);


    const grid = document.createElement('div');
    grid.className = 'plan-meta-grid';
    const basePairs = [
      ['Numéro', room.room_num],
      ['Catégorie', room.roomType],
      ['Étage', roomFloorLabel(room)],
      ['RoomState', room.roomState],
      ['Etat', room.etat],
      ['Mode plan', getPlanRoomModeLabel(room)],
      ['Position', `x:${Math.round(roomPixelX(room))} · y:${Math.round(roomPixelY(room))}`],
      ['Plan', state.allLocked ? 'Verrouillé' : 'Modifiable'],
      ['Night', getNightInputSet().has(String(room.room_num)) ? 'À ouvrir (night)' : '—'],
      ['C actuel', hasManualSofa(room.room_num) ? 'Actif' : '—'],
      ['C précédent', roomHasEquipmentWrench(room) ? (isEquipmentCrossed(room.room_num) ? 'Barré manuellement' : 'Actif') : '—']
    ];
    const metaEntries = Object.entries(room.meta || {});
    const forcedMetaKeys = ['ROOM_MINMAIN_STATUS', 'MinMainReason', 'MinMainComment'];
    forcedMetaKeys.forEach((key)=>{
      if (!metaEntries.some(([label]) => label === key)) {
        metaEntries.push([key, room.meta && Object.prototype.hasOwnProperty.call(room.meta, key) ? room.meta[key] : '']);
      }
    });
    const pairs = [...basePairs, ...metaEntries];
    pairs.forEach(([label, value])=>{
      const isForcedField = forcedMetaKeys.includes(label);
      if (!isForcedField && (value == null || value === '')) return;
      const displayValue = (value == null || value === '') ? '—' : value;
      const row = document.createElement('div');
      row.className = 'plan-meta-row';
      row.innerHTML = `<div class="plan-meta-label">${String(detailLabel(label))}</div><div class="plan-meta-value">${String(displayValue)}</div>`;
      grid.appendChild(row);
    });
    host.appendChild(grid);
  }

  function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }
  function snap(v, step, base){ return Math.round((v - base) / step) * step + base; }

  function roomHasEquipmentWrench(room){
    const meta = room?.meta || {};
    const reason = String(meta.MinMainReason || meta.MINMAINREASON || '').trim().toLowerCase();
    const comment = String(meta.MinMainComment || meta.MINMAINCOMMENT || '').trim();
    if (!reason) return false;
    if (!reason.includes('equipement chambre')) return false;
    return !!comment;
  }

  function makeRoomCard(room, board, laneTop, laneHeight){
    const roomWidth = currentRoomWidth();
    const roomHeight = currentRoomHeight();
    const el = document.createElement('button');
    const roomKey = String(room.room_num || '').trim();
    const isNightRoom = getNightInputSet().has(roomKey);
    const hasDetectedEquipment = roomHasEquipmentWrench(room);
    if ((hasDetectedEquipment || isNightRoom) && state.manualSofaRooms.has(roomKey)) {
      state.manualSofaRooms.delete(roomKey);
      saveManualSofaRooms();
    }
    el.type = 'button';
    const roomMode = getPlanRoomMode(room);
    const shouldFadeRoom = !!state.fadeNonActionable && (roomMode === 'present' || roomMode === 'blocked');
    el.className = `plan-room-card ${normalizeEtatClass(room.etat)} ${getPlanRoomModeClass(room)}${String(state.selectedRoom) === roomKey ? ' is-selected' : ''}${state.allLocked ? ' is-locked' : ''}${isNightRoom ? ' is-night-target' : ''}${shouldFadeRoom ? ' is-faded' : ''}`;
    if (shouldFadeRoom) el.style.setProperty('--plan-fade-opacity', String(state.fadeOpacity));
    el.dataset.room = roomKey;
    const maxRow = Math.max(0, Math.floor((laneHeight - roomHeight - 16 - PLAN_PADDING_Y) / Math.max(1, currentRowStep())));
    room.gridRow = clamp(roomGridRow(room), 0, maxRow);
    room.gridCol = Math.max(0, roomGridCol(room));
    syncRoomPixelPosition(room);
    el.style.left = `${roomPixelX(room)}px`;
    el.style.top = `${laneTop + roomPixelY(room)}px`;
    const equipmentTitle = `Équipement chambre : ${String((room.meta?.MinMainComment || room.meta?.MINMAINCOMMENT || '')).replace(/"/g, '&quot;')}`;
    const showOpened = state.visualFilters?.opened !== false;
    const showToOpen = state.visualFilters?.toOpen !== false;
    const showNight = state.visualFilters?.night !== false;
    const showClosed = state.visualFilters?.closed !== false;
    const equipmentCrossed = isEquipmentCrossed(roomKey);
    const crossedClass = equipmentCrossed ? ` is-crossed${showClosed ? '' : ' is-crossed-hidden'}` : '';
    const baselineBadgeLabel = equipmentCrossed ? '✕' : 'C';
    const baselineBadge = hasDetectedEquipment && showOpened
      ? `<span class="plan-room-badge plan-room-badge-detected${crossedClass}" data-equipment-badge="1" data-room="${roomKey}" title="${equipmentTitle} · clic = barrer / débarrer">${baselineBadgeLabel}</span>`
      : '';
    const nightBadge = isNightRoom && showNight
      ? '<span class="plan-room-badge plan-room-badge-night" title="Liste night à ouvrir">N</span>'
      : '';
    const manualBadge = !hasDetectedEquipment && !isNightRoom && hasManualSofa(roomKey) && showToOpen
      ? '<span class="plan-room-badge plan-room-badge-manual" data-manual-sofa-badge="1" title="Sofa à ouvrir · clic = enlever"></span>'
      : '';
    el.innerHTML = `${baselineBadge}${nightBadge}${manualBadge}<div class="plan-room-number">${room.room_num}</div><div class="plan-room-type">${room.roomType || '—'}</div>`;
    el.querySelector('[data-equipment-badge]')?.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); toggleEquipmentCrossed(roomKey); });
    el.querySelector('[data-manual-sofa-badge]')?.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); toggleManualSofa(roomKey); });
    el.addEventListener('click', (e)=>{
      e.preventDefault();
      state.selectedRoom = roomKey;
      renderBoards();
      renderInspector();
    });
    el.addEventListener('contextmenu', (e)=>{
      e.preventDefault();
      e.stopPropagation();
      state.selectedRoom = roomKey;
      toggleManualSofa(roomKey);
    });

    el.style.setProperty('--plan-room-width', `${roomWidth}px`);
    el.style.setProperty('--plan-room-height', `${roomHeight}px`);
    el.style.width = `${roomWidth}px`;
    el.style.minHeight = `${roomHeight}px`;

    if (!state.allLocked) {
      let drag = null;
      el.addEventListener('pointerdown', (e)=>{
        if (e.button !== 0) return;
        drag = { startX: e.clientX, startY: e.clientY, roomX: roomPixelX(room), roomY: roomPixelY(room) };
        el.classList.add('dragging');
        el.setPointerCapture?.(e.pointerId);
      });
      el.addEventListener('pointermove', (e)=>{
        if (!drag) return;
        const rect = board.getBoundingClientRect();
        const maxCol = Math.max(0, Math.floor((rect.width - roomWidth - 16 - PLAN_PADDING_X) / Math.max(1, currentColStep())));
        const nextX = clamp(drag.roomX + (e.clientX - drag.startX), PLAN_PADDING_X, rect.width - roomWidth - 16);
        const nextY = clamp(drag.roomY + (e.clientY - drag.startY), PLAN_PADDING_Y, laneHeight - roomHeight - 16);
        room.gridCol = clamp(Math.round((nextX - PLAN_PADDING_X) / Math.max(1, currentColStep())), 0, maxCol);
        room.gridRow = clamp(Math.round((nextY - PLAN_PADDING_Y) / Math.max(1, currentRowStep())), 0, maxRow);
        syncRoomPixelPosition(room);
        el.style.left = `${roomPixelX(room)}px`;
        el.style.top = `${laneTop + roomPixelY(room)}px`;
      });
      const endDrag = ()=>{
        if (!drag) return;
        drag = null;
        el.classList.remove('dragging');
        saveRooms(state);
        renderInspector();
      };
      el.addEventListener('pointerup', endDrag);
      el.addEventListener('pointercancel', endDrag);
    }
    return el;
  }

  function currentElevatorWidth(){ return Math.round(ELEVATOR_WIDTH * Math.max(0.8, state.blockScale)); }
  function currentElevatorHeight(){ return Math.round(ELEVATOR_HEIGHT * Math.max(0.8, state.blockScale)); }

  function makeElevatorCard(elevator, board, laneTop, laneHeight){
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `plan-elevator-card${state.allLocked ? ' is-locked' : ''}`;
    el.dataset.elevator = String(elevator.id);
    const width = currentElevatorWidth();
    const height = currentElevatorHeight();
    const maxY = Math.max(PLAN_PADDING_Y, laneHeight - height - 16);
    elevator.y = clamp(elevator.y, PLAN_PADDING_Y, maxY);
    el.dataset.laneTop = String(laneTop);
    el.style.left = `${elevator.x}px`;
    el.style.top = `${laneTop + elevator.y}px`;
    el.style.width = `${width}px`;
    el.style.height = `${height}px`;
    el.title = elevator.name;
    el.setAttribute('aria-label', elevator.name);
    el.innerHTML = `<span class="plan-elevator-code">${elevator.shortLabel || elevator.name}</span>`;

    if (!state.allLocked) {
      let drag = null;
      el.addEventListener('pointerdown', (e)=>{
        if (e.button !== 0) return;
        drag = { startX: e.clientX, startY: e.clientY, baseX: elevator.x, baseY: elevator.y };
        el.classList.add('dragging');
        el.setPointerCapture?.(e.pointerId);
      });
      el.addEventListener('pointermove', (e)=>{
        if (!drag) return;
        const rect = board.getBoundingClientRect();
        const nextX = clamp(drag.baseX + (e.clientX - drag.startX), PLAN_PADDING_X, rect.width - width - 16);
        const nextY = clamp(drag.baseY + (e.clientY - drag.startY), PLAN_PADDING_Y, maxY);
        elevator.x = snap(nextX, currentColStep(), PLAN_PADDING_X);
        elevator.y = snap(nextY, currentRowStep(), PLAN_PADDING_Y);
        elevator.x = clamp(elevator.x, PLAN_PADDING_X, rect.width - width - 16);
        elevator.y = clamp(elevator.y, PLAN_PADDING_Y, maxY);
        document.querySelectorAll(`.plan-elevator-card[data-elevator="${elevator.id}"]`).forEach(node => {
          node.style.left = `${elevator.x}px`;
          node.style.top = `${laneTop + elevator.y}px`;
        });
      });
      const endDrag = ()=>{
        if (!drag) return;
        drag = null;
        document.querySelectorAll(`.plan-elevator-card[data-elevator="${elevator.id}"]`).forEach(node => node.classList.remove('dragging'));
        saveElevators(state);
        renderBoards();
      };
      el.addEventListener('pointerup', endDrag);
      el.addEventListener('pointercancel', endDrag);
    }
    return el;
  }

  function renderBoards(){
    const host = byId('plan-stage');
    const counter = byId('plan-room-count');
    if (!host) return;
    host.innerHTML = '';
    const rooms = getFilteredRooms();
    renderPlanTypeBalance();
    if (counter) counter.textContent = `${rooms.length} chambre${rooms.length > 1 ? 's' : ''}`;
    if (!rooms.length) {
      const empty = document.createElement('div');
      empty.className = 'plan-empty-state';
      empty.textContent = 'Aucune chambre ne correspond au filtre actuel.';
      host.appendChild(empty);
      return;
    }
    syncPlanSettingsUi();
    const grouped = new Map();
    rooms.forEach(room => {
      const label = roomFloorLabel(room);
      if (!grouped.has(label)) grouped.set(label, []);
      grouped.get(label).push(room);
    });
    const floors = getVisibleFloors().filter(label => grouped.has(label));
    const wrap = document.createElement('section');
    wrap.className = 'plan-floor-board plan-floor-board-master';
    const head = document.createElement('div');
    head.className = 'plan-floor-head';
    head.innerHTML = `<div class="plan-floor-meta">${floors.length} niveau${floors.length > 1 ? 'x' : ''}</div>`;
    const board = document.createElement('div');
    board.className = 'plan-floor-canvas plan-master-canvas';

    let cursor = 8;
    const laneOffsets = new Map();
    floors.forEach(label => {
      const floorRooms = grouped.get(label) || [];
      const maxRoomBottom = floorRooms.reduce((max, room) => Math.max(max, roomPixelY(room) + currentRoomHeight()), PLAN_PADDING_Y + currentRoomHeight());
      const maxElevatorBottom = (state.elevators || []).reduce((max, elevator) => Math.max(max, Number(elevator?.y || 0) + currentElevatorHeight()), PLAN_PADDING_Y + currentElevatorHeight());
      const contentBottom = Math.max(maxRoomBottom, maxElevatorBottom);
      const savedLaneHeight = Number(state.laneHeights[label] || 190);
      const laneHeight = Math.max(150, Math.max(savedLaneHeight, contentBottom + 20));
      laneOffsets.set(label, { top: cursor, height: laneHeight });
      const lane = document.createElement('div');
      lane.className = 'plan-floor-lane';
      lane.style.top = `${cursor}px`;
      lane.style.height = `${laneHeight}px`;
      lane.innerHTML = `<div class="plan-floor-lane-label">${label}</div>`;
      board.appendChild(lane);
      cursor += laneHeight + PLAN_LANE_GAP;
    });
    board.style.height = `${cursor + 8}px`;

    floors.forEach(label => {
      const lane = laneOffsets.get(label);
      (state.elevators || []).forEach(elevator => board.appendChild(makeElevatorCard(elevator, board, lane.top, lane.height)));
      (grouped.get(label) || []).forEach(room => board.appendChild(makeRoomCard(room, board, lane.top, lane.height)));
    });
    wrap.append(head, board);
    host.appendChild(wrap);
  }

  function render(){
    if (!state.rooms.length) state.rooms = loadRooms();
    fillFloorFilter();
    bindToolbar();
    renderLaneControls();
    renderBoards();
    renderInspector();
    refreshOperationalInputsUi();
  }

  window.PLAN = { render };
  document.addEventListener('DOMContentLoaded', render);
})();

<?php
/**
 * Frosty Foods — WordPress theme.
 *
 * Renders the full Frosty Foods single-page site and powers its built-in
 * dashboard ("Frosty CMS"). Every text, image, colour, product and section
 * edited from the dashboard is stored in the `frosty_content` option.
 *
 * REST API (namespace frosty/v1):
 *   GET  /content  public   – current content (JSON)
 *   POST /content  token    – save content
 *   POST /login    public   – {code} → {token}   (rate limited)
 *   POST /logout   token
 *   POST /upload   token    – multipart "file" → {url}
 *   POST /code     token    – {current, code} change the dashboard code
 *
 * @package Frosty_Foods
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'FROSTY_THEME_VERSION', '1.0.0' );
define( 'FROSTY_DEFAULT_CODE', '2026' );

/* -------------------------------------------------------------------------
 * Front end: this theme prints its own complete page, so keep WP output lean.
 * ---------------------------------------------------------------------- */
add_filter( 'show_admin_bar', '__return_false' );

add_action(
	'wp_enqueue_scripts',
	function () {
		foreach ( array( 'wp-block-library', 'wp-block-library-theme', 'global-styles', 'classic-theme-styles', 'core-block-supports' ) as $handle ) {
			wp_dequeue_style( $handle );
			wp_deregister_style( $handle );
		}
	},
	100
);
remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
remove_action( 'wp_print_styles', 'print_emoji_styles' );
remove_action( 'wp_enqueue_scripts', 'wp_enqueue_global_styles' );
remove_action( 'wp_body_open', 'wp_global_styles_render_svg_filters' );
remove_action( 'wp_footer', 'wp_enqueue_global_styles', 1 );

/* -------------------------------------------------------------------------
 * Storage helpers
 * ---------------------------------------------------------------------- */

/**
 * Saved dashboard content as an array.
 *
 * @return array
 */
function frosty_get_content() {
	$raw  = get_option( 'frosty_content', '' );
	$data = $raw ? json_decode( $raw, true ) : null;
	return is_array( $data ) ? $data : array();
}

/**
 * Hash of the dashboard access code (created with the default code on first use).
 *
 * @return string
 */
function frosty_code_hash() {
	$hash = get_option( 'frosty_code_hash' );
	if ( ! $hash ) {
		$hash = wp_hash_password( FROSTY_DEFAULT_CODE );
		update_option( 'frosty_code_hash', $hash, false );
	}
	return $hash;
}

/**
 * Transient key for a session token (tokens are never stored in clear).
 *
 * @param string $token Session token.
 * @return string
 */
function frosty_token_key( $token ) {
	return 'frosty_tok_' . hash( 'sha256', (string) $token );
}

/**
 * REST permission check: a valid dashboard session token, or a logged-in administrator.
 *
 * @param WP_REST_Request $request Request.
 * @return true|WP_Error
 */
function frosty_auth( $request ) {
	if ( current_user_can( 'manage_options' ) ) {
		return true;
	}
	$token = $request->get_header( 'x-frosty-token' );
	if ( $token && get_transient( frosty_token_key( $token ) ) ) {
		return true;
	}
	return new WP_Error( 'frosty_auth', __( 'Please sign in to the dashboard again.', 'frosty-foods' ), array( 'status' => 401 ) );
}

/**
 * Recursively sanitise dashboard content before saving.
 *
 * Text may contain a few inline tags (<br>, <em>, <b>, <span class>); links and
 * media are limited to safe protocols; everything else is plain data.
 *
 * @param mixed  $value Value.
 * @param string $key   Key of the value in its parent.
 * @return mixed
 */
function frosty_clean( $value, $key = '' ) {
	if ( is_array( $value ) ) {
		$out = array();
		foreach ( $value as $k => $v ) {
			$clean_key         = is_int( $k ) ? $k : wp_strip_all_tags( (string) $k );
			$out[ $clean_key ] = frosty_clean( $v, is_int( $k ) ? $key : (string) $k );
		}
		return $out;
	}
	if ( is_bool( $value ) || is_int( $value ) || is_float( $value ) || is_null( $value ) ) {
		return $value;
	}
	if ( ! is_string( $value ) ) {
		return '';
	}
	if ( in_array( $key, array( 'href', 'src', 'poster', 'front', 'back' ), true ) ) {
		if ( '' === $value || '#' === $value[0] || 0 === strpos( $value, 'assets/' ) || preg_match( '#^data:image/(png|jpe?g|gif|webp|svg\+xml)[;,]#i', $value ) ) {
			return $value;
		}
		return esc_url_raw( $value, array( 'http', 'https', 'mailto', 'tel' ) );
	}
	if ( false === strpos( $value, '<' ) ) {
		return $value;
	}
	return wp_kses(
		$value,
		array(
			'span'   => array( 'class' => true ),
			'em'     => array(),
			'i'      => array(),
			'b'      => array(),
			'strong' => array(),
			'small'  => array(),
			'br'     => array(),
		)
	);
}

/* -------------------------------------------------------------------------
 * REST API
 * ---------------------------------------------------------------------- */
add_action(
	'rest_api_init',
	function () {
		register_rest_route(
			'frosty/v1',
			'/content',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => function () {
						return rest_ensure_response( (object) frosty_get_content() );
					},
					'permission_callback' => '__return_true',
				),
				array(
					'methods'             => 'POST',
					'callback'            => 'frosty_rest_save',
					'permission_callback' => 'frosty_auth',
				),
			)
		);
		register_rest_route(
			'frosty/v1',
			'/login',
			array(
				'methods'             => 'POST',
				'callback'            => 'frosty_rest_login',
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			'frosty/v1',
			'/logout',
			array(
				'methods'             => 'POST',
				'callback'            => 'frosty_rest_logout',
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			'frosty/v1',
			'/upload',
			array(
				'methods'             => 'POST',
				'callback'            => 'frosty_rest_upload',
				'permission_callback' => 'frosty_auth',
			)
		);
		register_rest_route(
			'frosty/v1',
			'/code',
			array(
				'methods'             => 'POST',
				'callback'            => 'frosty_rest_code',
				'permission_callback' => 'frosty_auth',
			)
		);
	}
);

/**
 * POST /login — exchange the access code for a 12-hour session token.
 *
 * @param WP_REST_Request $request Request.
 * @return WP_REST_Response|WP_Error
 */
function frosty_rest_login( $request ) {
	$ip       = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : 'unknown';
	$lock_key = 'frosty_try_' . md5( $ip );
	$tries    = (int) get_transient( $lock_key );
	if ( $tries >= 8 ) {
		return new WP_Error( 'frosty_locked', __( 'Too many attempts. Try again in 15 minutes.', 'frosty-foods' ), array( 'status' => 429 ) );
	}
	$code = (string) $request->get_param( 'code' );
	if ( '' === $code || ! wp_check_password( $code, frosty_code_hash() ) ) {
		set_transient( $lock_key, $tries + 1, 15 * MINUTE_IN_SECONDS );
		return new WP_Error( 'frosty_wrong', __( 'Wrong code', 'frosty-foods' ), array( 'status' => 403 ) );
	}
	delete_transient( $lock_key );
	$token = wp_generate_password( 48, false, false );
	set_transient( frosty_token_key( $token ), 1, 12 * HOUR_IN_SECONDS );
	return rest_ensure_response( array( 'token' => $token ) );
}

/**
 * POST /logout — end a session.
 *
 * @param WP_REST_Request $request Request.
 * @return WP_REST_Response
 */
function frosty_rest_logout( $request ) {
	$token = $request->get_header( 'x-frosty-token' );
	if ( $token ) {
		delete_transient( frosty_token_key( $token ) );
	}
	return rest_ensure_response( array( 'ok' => true ) );
}

/**
 * POST /content — save all dashboard content.
 *
 * @param WP_REST_Request $request Request.
 * @return WP_REST_Response|WP_Error
 */
function frosty_rest_save( $request ) {
	$body = $request->get_body();
	if ( strlen( $body ) > 8 * MB_IN_BYTES ) {
		return new WP_Error( 'frosty_big', __( 'Content is too large. Upload images instead of embedding them.', 'frosty-foods' ), array( 'status' => 413 ) );
	}
	$data = json_decode( $body, true );
	if ( ! is_array( $data ) ) {
		return new WP_Error( 'frosty_json', __( 'Invalid content.', 'frosty-foods' ), array( 'status' => 400 ) );
	}
	if ( isset( $data['settings']['codeHash'] ) ) {
		unset( $data['settings']['codeHash'] ); // The WordPress code lives in its own hashed option.
	}
	$data = frosty_clean( $data );
	update_option( 'frosty_content', wp_json_encode( $data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ), false );
	return rest_ensure_response(
		array(
			'ok'    => true,
			'saved' => current_time( 'mysql' ),
		)
	);
}

/**
 * POST /upload — add an image or video to the Media Library.
 *
 * @param WP_REST_Request $request Request.
 * @return WP_REST_Response|WP_Error
 */
function frosty_rest_upload( $request ) {
	$files = $request->get_file_params();
	if ( empty( $files['file'] ) ) {
		return new WP_Error( 'frosty_nofile', __( 'No file received.', 'frosty-foods' ), array( 'status' => 400 ) );
	}
	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/media.php';
	require_once ABSPATH . 'wp-admin/includes/image.php';

	$mimes = array(
		'jpg|jpeg|jpe' => 'image/jpeg',
		'png'          => 'image/png',
		'gif'          => 'image/gif',
		'webp'         => 'image/webp',
		'ico'          => 'image/x-icon',
		'mp4|m4v'      => 'video/mp4',
		'webm'         => 'video/webm',
	);
	$_FILES['file'] = $files['file']; // phpcs:ignore WordPress.Security.NonceVerification.Missing -- authorised by frosty_auth().
	$attachment_id  = media_handle_upload(
		'file',
		0,
		array(),
		array(
			'test_form' => false,
			'mimes'     => $mimes,
		)
	);
	if ( is_wp_error( $attachment_id ) ) {
		return new WP_Error( 'frosty_upload', $attachment_id->get_error_message(), array( 'status' => 400 ) );
	}
	return rest_ensure_response(
		array(
			'id'  => $attachment_id,
			'url' => wp_get_attachment_url( $attachment_id ),
		)
	);
}

/**
 * POST /code — change the dashboard access code.
 *
 * @param WP_REST_Request $request Request.
 * @return WP_REST_Response|WP_Error
 */
function frosty_rest_code( $request ) {
	$current = (string) $request->get_param( 'current' );
	$new     = (string) $request->get_param( 'code' );
	if ( ! wp_check_password( $current, frosty_code_hash() ) ) {
		return new WP_Error( 'frosty_wrong', __( 'The current code is wrong.', 'frosty-foods' ), array( 'status' => 403 ) );
	}
	if ( strlen( $new ) < 4 ) {
		return new WP_Error( 'frosty_short', __( 'The code must be at least 4 characters.', 'frosty-foods' ), array( 'status' => 400 ) );
	}
	update_option( 'frosty_code_hash', wp_hash_password( $new ), false );
	return rest_ensure_response( array( 'ok' => true ) );
}

/* -------------------------------------------------------------------------
 * WP admin: Appearance › Frosty Dashboard (open, reset code, backup)
 * ---------------------------------------------------------------------- */
add_action(
	'admin_menu',
	function () {
		add_theme_page( 'Frosty Dashboard', 'Frosty Dashboard', 'manage_options', 'frosty-dashboard', 'frosty_admin_page' );
	}
);

add_action(
	'admin_post_frosty_reset_code',
	function () {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Not allowed.', 'frosty-foods' ) );
		}
		check_admin_referer( 'frosty_reset_code' );
		update_option( 'frosty_code_hash', wp_hash_password( FROSTY_DEFAULT_CODE ), false );
		wp_safe_redirect( admin_url( 'themes.php?page=frosty-dashboard&reset=1' ) );
		exit;
	}
);

add_action(
	'admin_post_frosty_export',
	function () {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Not allowed.', 'frosty-foods' ) );
		}
		check_admin_referer( 'frosty_export' );
		nocache_headers();
		header( 'Content-Type: application/json; charset=utf-8' );
		header( 'Content-Disposition: attachment; filename=frosty-content-' . gmdate( 'Y-m-d' ) . '.json' );
		echo wp_json_encode( (object) frosty_get_content(), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		exit;
	}
);

/**
 * Admin page markup.
 */
function frosty_admin_page() {
	$dashboard_url = home_url( '/#dashboard' );
	?>
	<div class="wrap">
		<h1>Frosty Dashboard · لوحة التحكم</h1>
		<?php if ( isset( $_GET['reset'] ) ) : // phpcs:ignore WordPress.Security.NonceVerification.Recommended ?>
			<div class="notice notice-success"><p><?php echo esc_html( 'The dashboard code is back to ' . FROSTY_DEFAULT_CODE . '.' ); ?></p></div>
		<?php endif; ?>
		<p>All website content (texts, images, colours, products, sections, SEO) is edited from the dashboard on the site itself.</p>
		<p>كل محتوى الموقع (النصوص والصور والألوان والمنتجات والأقسام والـ SEO) يتعدل من لوحة التحكم على الموقع نفسه.</p>
		<p><a class="button button-primary button-hero" href="<?php echo esc_url( $dashboard_url ); ?>" target="_blank" rel="noopener">Open the dashboard · افتح لوحة التحكم</a></p>
		<p>Or scroll to the footer of the website and click <strong>Dashboard · لوحة التحكم</strong>.</p>
		<hr>
		<h2>Forgot the code? · نسيت الكود؟</h2>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<?php wp_nonce_field( 'frosty_reset_code' ); ?>
			<input type="hidden" name="action" value="frosty_reset_code">
			<?php submit_button( 'Reset the code to ' . FROSTY_DEFAULT_CODE . ' · إعادة الكود إلى ' . FROSTY_DEFAULT_CODE, 'secondary', 'submit', false ); ?>
		</form>
		<hr>
		<h2>Backup · نسخة احتياطية</h2>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<?php wp_nonce_field( 'frosty_export' ); ?>
			<input type="hidden" name="action" value="frosty_export">
			<?php submit_button( 'Download content backup (JSON)', 'secondary', 'submit', false ); ?>
		</form>
	</div>
	<?php
}

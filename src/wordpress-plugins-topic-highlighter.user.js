// ==UserScript==
// @name         WordPress.org plugins and themes topic highlighter
// @namespace    http://clorith.net/
// @version      0.4.0
// @description  Add status highlights to topics for easy overviews.
// @author       Clorith
// @match        https://wordpress.org/support/*
// @match        https://*.wordpress.org/support/*
// @exclude      https://wordpress.org/support/view/pending*
// @exclude      https://*.wordpress.org/support/view/pending*
// @exclude      https://wordpress.org/support/view/spam*
// @exclude      https://*.wordpress.org/support/view/spam*
// @require      https://code.jquery.com/jquery-1.11.0.min.js
// @resource     configHtml https://raw.githubusercontent.com/wporg-support/topic-highlighter/master/src/options.html
// @updateURL    https://github.com/wporg-support/topic-highlighter/raw/master/src/wordpress-plugins-topic-highlighter.user.js
// @downloadURL  https://github.com/wporg-support/topic-highlighter/raw/master/src/wordpress-plugins-topic-highlighter.user.js
// @grant        GM_getResourceText
// ==/UserScript==

jQuery(document).ready(function( $ ) {
	/*
	 * The rules here are cascading, later rules will overwrite earlier ones.
	 * This is done to ensure the right priority is applied, as some states are more important than others.
	 */

	var text, $topics, $permalink,
        icons = {
            old: '<span class="dashicons dashicons-clock" style="font-size: 18px;margin-right: 3px;top: 2px; position: relative;" aria-label="Old topic:"></span>',
            unattended: '<span class="dashicons dashicons-warning" style="font-size: 18px;margin-right: 3px;top: 2px; position: relative;" aria-label="Unattended topic:"></span>'
        },
		settings = {
			color: {
				resolved: {
					background: 'rgb(203, 255, 181)',
					text: 'inherit'
				},
				new: {
					background: '#ffeb00',
					text: 'inherit'
				},
				old: {
					background: '#ffc173',
					text: 'inherit'
				}
			},
            nonPOrT: false // Non-Plugin or Theme highlighting
		};

	function should_topics_process() {
        if (settings.nonPOrT) {
            return true;
        }

        return window.location.href.match(/\/support\/(theme|plugin)\/*/g);
    }

	function process_topics() {
		if ( ! should_topics_process() ) {
			return false;
		}

		/* Highlight topics that are more than a week old.
         * Prepends an icon to indicate this topic is getting old.
         */
		$topics = $( '.bbp-topic-freshness' );

		$topics.each(function() {
			text = $( 'a', $(this) ).text();
            $permalink = $( 'a.bbp-topic-permalink', $( this ).closest( 'ul' ) );

			if ( text.includes( 'week' ) || text.includes( 'month' ) || text.includes( 'year' ) ) {
				$(this).closest( 'ul' ).css( 'background-color', settings.color.old.background );
				$( 'a', $( this ).closest( 'ul' ) ).css( 'color', settings.color.old.text );

                $( '.dashicons', $permalink ).remove();
                $permalink.prepend( icons.old );
			}
		});

		/* Highlight topics not yet replied to.
         * Prepends an icon to indicate this topic has gone unattended.
         */
		$topics = $( '.bbp-topic-voice-count' );

		$topics.each(function() {
			text = $(this).text();
            $permalink = $( 'a.bbp-topic-permalink', $( this ).closest( 'ul' ) );

			if ( '1' === text ) {
				$(this).closest( 'ul' ).css( 'background-color', settings.color.new.background );
				$( 'a', $( this ).closest( 'ul' ) ).css( 'color', settings.color.new.text );

                $( '.dashicons', $permalink ).remove();
                $permalink.prepend( icons.unattended );
			}
		});

		/* Highlight resolved threads.
         * Resolved topics on the forums already get prepended with a check-mark tick, so we don't
         * need to add any other indicators our selves.
         */
		$( 'span.resolved' ).closest( 'ul' ).css( 'background-color', settings.color.resolved.background );
		$( 'a', $( 'span.resolved' ).closest( 'ul' ) ).css( 'color', settings.color.resolved.text )
	}

	function set_colors() {
		var stored = localStorage.getItem( 'wp_highlighter' );

		if ( null !== stored ) {
			settings = JSON.parse( stored );
		}
	}

	// Set up color choices.
	set_colors();

	// Run processer.
	process_topics();

	// Add options link to the sidebar.
	$( '.entry-meta.sidebar div:first-of-type ul' ).append( '<li><a href="#" id="tamper-show-options">Highlighter Options</a></li>' );

	// Trigger options form display
	$(".entry-meta").on( 'click', '#tamper-show-options', function( e ) {
		e.preventDefault();

		$( '#bbpress-forums' ).prepend( GM_getResourceText( 'configHtml' ) );

		$( '#tamper-wp-topic-highlighter-resolved' ).val( settings.color.resolved.background );
		$( '#tamper-wp-topic-highlighter-resolved-text' ).val( settings.color.resolved.text );
		$( '#tamper-wp-topic-highlighter-new' ).val( settings.color.new.background );
		$( '#tamper-wp-topic-highlighter-new-text' ).val( settings.color.new.text );
		$( '#tamper-wp-topic-highlighter-old' ).val( settings.color.old.background );
		$( '#tamper-wp-topic-highlighter-old-text' ).val( settings.color.old.text );
 		$( '#tamper-wp-topic-highlighter-nonport' ).prop( 'checked', settings.nonPOrT );
	});

	// Save options
	$( '#page' ).on( 'submit', '#tamper-wp-topic-highlighter', function( e ) {
		e.preventDefault();

		settings.color.resolved.background = $( '#tamper-wp-topic-highlighter-resolved' ).val();
		settings.color.resolved.text = $( '#tamper-wp-topic-highlighter-resolved-text' ).val();
		settings.color.new.background = $( '#tamper-wp-topic-highlighter-new' ).val();
		settings.color.new.text = $( '#tamper-wp-topic-highlighter-new-text' ).val();
		settings.color.old.background = $( '#tamper-wp-topic-highlighter-old' ).val();
		settings.color.old.text = $( '#tamper-wp-topic-highlighter-old-text' ).val();
		settings.nonPOrT = $( '#tamper-wp-topic-highlighter-nonport' ).is( ':checked');

		localStorage.setItem( 'wp_highlighter', JSON.stringify( settings ) );

		$( this ).remove();

		// Re-process topics after making edits.
		process_topics();
	}).on( 'click', '.cancel', function( e ) {
		e.preventDefault();
		$( this ).closest( 'form' ).remove();
	});
});

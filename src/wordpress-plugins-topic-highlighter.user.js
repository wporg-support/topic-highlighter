// ==UserScript==
// @name         WordPress.org plugins and themes topic highlighter
// @namespace    http://clorith.net/
// @version      0.3.2
// @description  Add status highlights to topics for easy overviews.
// @author       Clorith
// @match        https://wordpress.org/support/plugin/*
// @match        https://wordpress.org/support/theme/*
// @require      https://code.jquery.com/jquery-1.11.0.min.js
// @resource     configHtml https://raw.githubusercontent.com/Clorith/wporg-topic-highlighter/master/src/options.html
// @grant        GM_getResourceText
// ==/UserScript==

jQuery(document).ready(function( $ ) {
	/*
	 * The rules here are cascading, later rules will overwrite earlier ones.
	 * This is doen to ensure the right priority is applied, as some states are more important than others.
	 */

	var text, $topics,
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
			}
		};

	function process_topics() {
		// Highlight topics that are more than a week old.
		$topics = $( '.bbp-topic-freshness' );

		$topics.each(function() {
			text = $( 'a', $(this) ).text();

			if ( text.includes( 'week' ) || text.includes( 'month' ) || text.includes( 'year' ) ) {
				$(this).closest( 'ul' ).css( 'background-color', settings.color.old.background );
				$( 'a', $( this ).closest( 'ul' ) ).css( 'color', settings.color.old.text )
			}
		});

		// Highlight topics not yet replied to.
		$topics = $( '.bbp-topic-voice-count' );

		$topics.each(function() {
			text = $(this).text();

			if ( '1' === text ) {
				$(this).closest( 'ul' ).css( 'background-color', settings.color.new.background );
				$( 'a', $( this ).closest( 'ul' ) ).css( 'color', settings.color.new.text );
			}
		});

		// Highlight resolved threads.
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

		localStorage.setItem( 'wp_highlighter', JSON.stringify( settings ) );

		$( this ).remove();

		// Re-process topics after making edits.
		process_topics();
	}).on( 'click', '.cancel', function( e ) {
		e.preventDefault();
		$( this ).closest( 'form' ).remove();
	});
});

// ==UserScript==
// @name         WordPress.org plugins and themes topic highlighter
// @namespace    http://clorith.net/
// @version      0.6.0
// @description  Add status highlights to topics for easy overviews.
// @author       Clorith
// @match        https://wordpress.org/support/*
// @match        https://*.wordpress.org/support/*
// @exclude      https://wordpress.org/support/view/pending*
// @exclude      https://*.wordpress.org/support/view/pending*
// @exclude      https://wordpress.org/support/view/spam*
// @exclude      https://*.wordpress.org/support/view/spam*
// @resource     configHtml https://raw.githubusercontent.com/wporg-support/topic-highlighter/trunk/src/options.html
// @updateURL    https://github.com/wporg-support/topic-highlighter/raw/trunk/src/wordpress-plugins-topic-highlighter.user.js
// @downloadURL  https://github.com/wporg-support/topic-highlighter/raw/trunk/src/wordpress-plugins-topic-highlighter.user.js
// @grant        GM_getResourceText
// ==/UserScript==

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', TopicHighlighter );
} else {
	TopicHighlighter();
}

function TopicHighlighter() {
	/*
	 * The rules here are cascading, later rules will overwrite earlier ones.
	 * This is done to ensure the right priority is applied, as some states are more important than others.
	 */

	const isReviewsPage = document.body.classList.contains( 'bbp-view-reviews' );

	let formRendered = false;

	let topics,
		icons = {
			old: '<span class="dashicons dashicons-clock" style="font-size: 18px;margin-right: 3px;top: 2px; position: relative;" aria-label="Old topic:"></span>',
			unattended: '<span class="dashicons dashicons-warning" style="font-size: 18px;margin-right: 3px;top: 2px; position: relative;" aria-label="Unattended topic:"></span>',
			archived: '<span class="dashicons dashicons-trash" style="font-size: 18px;margin-right: 3px;top: 2px; position: relative;" aria-label="Archived topic:"></span>'
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
				},
				archived: {
					background: '#6500b9',
					text: '#fff'
				}
			},
			nonPOrT: false, // Non-Plugin or Theme highlighting.
			reviewReplyResolved: false // Reviews with replies are considered resolved.
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

		let permalink,
			voiceCount,
			freshness,
			resolved,
			archived;

		topics = document.body.querySelectorAll( '.bbp-body > ul' );
		topics.forEach(function(topic) {
			permalink = topic.querySelector('a.bbp-topic-permalink');
			voiceCount = Number(topic.querySelector('.bbp-topic-voice-count').textContent);
			freshness = topic.querySelector('.bbp-topic-freshness').textContent;
			resolved = permalink.querySelectorAll('.resolved').length > 0;
			archived = topic.classList.contains('status-archived');

			/* Highlight resolved threads.
			* Resolved topics on the forums already get prepended with a check-mark tick, so we don't
			* need to add any other indicators our selves.
			*/
			if ( archived ) {
				topic.style.backgroundColor = settings.color.archived.background;
				topic.querySelectorAll('a').forEach(a => a.style.color = settings.color.archived.text);
				topic.querySelectorAll('li').forEach(li => li.style.color = settings.color.archived.text);

				permalink.querySelectorAll('.dashicons:not(.wporg-ratings .dashicons)').forEach(icon => icon.remove());
				permalink.insertAdjacentHTML('afterbegin', icons.archived);
			} else if ( resolved || ( settings.reviewReplyResolved && isReviewsPage && voiceCount > 1 ) ) {
				topic.style.backgroundColor = settings.color.resolved.background;
				topic.querySelectorAll('a').forEach(a => a.style.color = settings.color.resolved.text);
			} else {
				/* Highlight topics that are more than a week old.
				* Prepends an icon to indicate this topic is getting old.
				*/
				if ( freshness.includes( 'week' ) || freshness.includes( 'month' ) || freshness.includes( 'year' ) ) {
					topic.style.backgroundColor = settings.color.old.background;
					topic.querySelectorAll('a').forEach(a => a.style.color = settings.color.old.text);

					permalink.querySelectorAll('.dashicons:not(.wporg-ratings .dashicons)').forEach(icon => icon.remove());
					permalink.insertAdjacentHTML('afterbegin', icons.old);
				}
				/* Highlight topics not yet replied to.
				* Prepends an icon to indicate this topic has gone unattended.
				*/
				if ( 1 === voiceCount ) {
					topic.style.backgroundColor = settings.color.new.background;
					topic.querySelectorAll('a').forEach(a => a.style.color = settings.color.new.text);

					permalink.querySelectorAll('.dashicons:not(.wporg-ratings .dashicons)').forEach(icon => icon.remove());
					permalink.insertAdjacentHTML('afterbegin', icons.unattended);
				}
			}
		});
	}

	function mergeSettings( target, source ) {
		// Iterate over each key in the source object
		for ( const key in source ) {
			// If the property is itself an object, recurse
			if ( source[ key ] instanceof Object && key in target ) {
				target[ key] = mergeSettings( target[ key ], source[ key ] );
			} else {
				// Otherwise, directly assign the value from source to target
				target[ key ] = source[ key ];
			}
		}
		return target;
	}

	function set_colors() {
		let stored = localStorage.getItem( 'wp_highlighter' );

		if ( null !== stored ) {
			stored = JSON.parse( stored );
			settings = mergeSettings( settings, stored );
		}
	}

	// Set up color choices.
	set_colors();

	// Run processer.
	process_topics();

	// Add options link to the sidebar.
	document.querySelector('.entry-meta.sidebar div:first-of-type ul').insertAdjacentHTML('beforeend', '<li><a href="#" id="tamper-show-options">Highlighter Options</a></li>');

	// Trigger options form display
	document.querySelector('.entry-meta').addEventListener('click', function(e) {
		if (e.target && e.target.id === 'tamper-show-options') {
			e.preventDefault();

			// Check if the DOM contains the dynamically injected DOM node for the form already, if so, don't add it again.
			if ( formRendered ) {
				return;
			}

			document.querySelector('#bbpress-forums').insertAdjacentHTML('afterbegin', GM_getResourceText('configHtml'));

			document.querySelector('#tamper-wp-topic-highlighter-resolved').value = settings.color.resolved.background;
			document.querySelector('#tamper-wp-topic-highlighter-resolved-text').value = settings.color.resolved.text;
			document.querySelector('#tamper-wp-topic-highlighter-new').value = settings.color.new.background;
			document.querySelector('#tamper-wp-topic-highlighter-new-text').value = settings.color.new.text;
			document.querySelector('#tamper-wp-topic-highlighter-old').value = settings.color.old.background;
			document.querySelector('#tamper-wp-topic-highlighter-old-text').value = settings.color.old.text;
			document.querySelector('#tamper-wp-topic-highlighter-archived').value = settings.color.archived.background;
			document.querySelector('#tamper-wp-topic-highlighter-archived-text').value = settings.color.archived.text;
			document.querySelector('#tamper-wp-topic-highlighter-nonport').checked = settings.nonPOrT;
			document.querySelector('#tamper-wp-topic-highlighter-reviewReplyResolved').checked = settings.reviewReplyResolved;

			formRendered = true;
		}
	});

	// Save options
	document.querySelector('#page').addEventListener('submit', function(e) {
		if (e.target && e.target.id === 'tamper-wp-topic-highlighter') {
			e.preventDefault();

			settings.color.resolved.background = document.querySelector('#tamper-wp-topic-highlighter-resolved').value;
			settings.color.resolved.text = document.querySelector('#tamper-wp-topic-highlighter-resolved-text').value;
			settings.color.new.background = document.querySelector('#tamper-wp-topic-highlighter-new').value;
			settings.color.new.text = document.querySelector('#tamper-wp-topic-highlighter-new-text').value;
			settings.color.old.background = document.querySelector('#tamper-wp-topic-highlighter-old').value;
			settings.color.old.text = document.querySelector('#tamper-wp-topic-highlighter-old-text').value;
			settings.color.archived.background = document.querySelector('#tamper-wp-topic-highlighter-archived').value;
			settings.color.archived.text = document.querySelector('#tamper-wp-topic-highlighter-archived-text').value;
			settings.nonPOrT = document.querySelector('#tamper-wp-topic-highlighter-nonport').checked;
			settings.reviewReplyResolved = document.querySelector('#tamper-wp-topic-highlighter-reviewReplyResolved').checked;

			localStorage.setItem('wp_highlighter', JSON.stringify(settings));

			e.target.remove();
			formRendered = false;

			// Re-process topics after making edits.
			process_topics();
		}
	});

	document.querySelector('#page').addEventListener('click', function(e) {
		if ( e.target.closest( 'form' ).id !== 'tamper-wp-topic-highlighter' ) {
			return;
		}

		if (e.target && e.target.classList.contains('cancel')) {
			e.preventDefault();
			e.target.closest('form').remove();
			formRendered = false;
		}
	});
}

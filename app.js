var anchorHelper = (function ()
{
	var $link_template = $('<a target="contentFrame"></a>');

	return {
		newAnchor: function (url, text)
		{
			var $link = $link_template.clone();

			$link.attr("href", url);
			
			if (text != undefined)
				$link.text(text);

			return $link; 
		},

		subredditUrl: function (subreddit)
		{
			return "#/r/" + subreddit;
		},

		comboUrl: function (urls)
		{
			var result = "#/r/";
			for (var i = 0; i < urls.length; i++)
			{
				result += urls[i];
				if (i < urls.length - 1)
				{
					result += "+";
				}
			}
			return result;
		}
	};
}());

var layoutManager = (function ()
{
	var $sidebar = $("#sidebar");
	var $content = $("#content");
	var $iframe = $("#content iframe");
	var $admin = $(".admin", $sidebar);
	var $deleteArea = $("#delete-area");

	var window_width, window_height;
	var SIDEBAR_WIDTH = 210;

	var hidden = false;

	return {
		setup: function ()
		{
			$sidebar.width(SIDEBAR_WIDTH);
			$(window).resize( this.update );

			$sidebar.sortable(
			{
				handle: "h2",
				items: ".links",
				scroll: false,
				cancel: ".admin",
				refreshPositions: true,
				update: function()
				{
					storageManager.saveData();
				}
			});

			$(".links ul", $sidebar).sortable(
			{
				connectWith: '.links ul',
				items: 'li',
				scroll: false,
				refreshPositions: true,
				update: function()
				{
					storageManager.saveData();
				}
			});

			$deleteArea.droppable(
			{
				tolerance: 'pointer',
				activate: function ()
				{
					$(this).addClass("on");
				},
				deactivate: function ()
				{
					$(this).removeClass("on");
				},
				over: function (e, ui)
				{
					$(ui.draggable).css('opacity', '.75');
				},
				out: function (e, ui)
				{
					$(ui.draggable).css('opacity', '1');
				},
				drop: function (e, ui)
				{
					ui.draggable.remove();
				}
			});

			$sidebar.on("click", ".collapse-button", function ()
			{
				var $parent = $(this).parent();
				var collapsed = $parent.addClass("collapsed").attr("data-collapsed");
				
				if (collapsed == "true")
				{
					$parent.removeClass("collapsed");
					collapsed = "false";
				}
				else
				{
					$parent.addClass("collapsed");
					collapsed = "true";
				}

				$parent.attr("data-collapsed", collapsed);
				storageManager.saveData();
			});

			$sidebar.on("click", "a", function ()
			{
				$iframe.attr("src", $(this).attr("href").replace("#", menuManager.getLinks().home.attr("href")) );
				return false;
			});

			this.update();
		},

		update: function ()
		{
			window_width = $(window).width();
			window_height = $(window).height();

			$sidebar.height(window_height);
			$content.height(window_height)
					.width(window_width - SIDEBAR_WIDTH);
		},

		getSidebar: function ()
		{
			return $sidebar;
		},

		getAdminSection: function ()
		{
			return $admin;
		},

		getLinkSections: function ()
		{
			return $(".links", $sidebar);
		},

		getContent: function ()
		{
			return $content;
		},

		getIframe: function ()
		{
			return $iframe;
		},

		newLinkSection: function (isNew)
		{
			var section = $('<section class="links"><h2></h2><div class="collapse-button"></div><ul class="ui-sortable"></ul><form><input type="text" placeholder="add a subreddit" /></form></section>');
			
			if (isNew === true)
			{
				$admin.after(section);				
			}
			else
			{
				$sidebar.append(section);
			}

			return section;
		},

		newLink: function (link)
		{
			return $("<li></li>").append(link);
		},

		updateHeading: function ($section)
		{
			var subreddits = [];
			$("li", $section).each(function (i, el)
			{
				subreddits.push( $(el).text() );
			});
			$("h2 a", $section).attr("href", anchorHelper.comboUrl(subreddits));
		}
	};
}());

var storageManager = (function()
{
	var storageKey = "reddit-manager";

	if (localStorage[storageKey] === undefined)
	{
		localStorage[storageKey] = "[]";
	}

	return {
		saveData: function ()
		{
			var data = [];
			layoutManager.getLinkSections().each(function (i, $section)
			{
				var sectionData = [];

				sectionData.push( $("h2", $section).text() );
				
				sectionData.push( "%" + ( $(this).attr("data-collapsed") == "true" ? "C" : "c" ) );

				$("li", $section).each(function (j)
				{
					sectionData.push( $(this).text() );
				});

				data.push(sectionData);
			});

			localStorage[storageKey] = JSON.stringify(data);
		},

		loadData: function (callback)
		{
			var data = JSON.parse(localStorage[storageKey]);
			localStorage[storageKey];
			for (var i = 0; i < data.length; i++)
			{
				var $section = layoutManager.newLinkSection();
				$("h2", $section).append( anchorHelper.newAnchor(anchorHelper.comboUrl(data[i].slice(2)), data[i][0]));

				var inc = 0;

				if (data[i][1] == "%C")
				{
					$section.addClass("collapsed");
					$section.attr("data-collapsed", "true");
					inc = 1;
				}
				else if (data[i][1] == "%c")
				{
					$section.attr("data-collapsed", "false");
					inc = 1;
				}

				for (var j = 1 + inc; j < data[i].length; j++)
				{
					$("ul", $section).append( layoutManager.newLink( anchorHelper.newAnchor( anchorHelper.subredditUrl( data[i][j] ), data[i][j]) ));
				}
			}

			if (callback !== undefined)
			{
				callback();
			}
		}
	};

}());

var formManager = (function()
{
	$("form", layoutManager.getLinkSections()).live("submit", function()
	{
		var data = $('input', this).val();
		$('input', this).val("");
		$("ul", $(this).parent()).append( layoutManager.newLink( anchorHelper.newAnchor( anchorHelper.subredditUrl( data ), data)) );
		storageManager.saveData();
		layoutManager.updateHeading( $(this).parent() );
		return false;
	});

	$("form", layoutManager.getAdminSection()).live("submit", function()
	{
		var data = $('input', this).val();
		$('input', this).val("");

		var $section = layoutManager.newLinkSection(true);
		$("h2", $section).append( anchorHelper.newAnchor(anchorHelper.comboUrl([]), data) );

		storageManager.saveData();		
		return false;
	});

	return {

	}

}());

var menuManager = (function ()
{
	var $iframe = $("#contentFrame");
	var $links = {
		back: $("#menu-back"),
		home: $("#menu-home"),
		refresh : $("#menu-refresh"),
		toggle: $("#menu-toggle"),
		mode: $("#menu-mode")
	};
	var modes = ["reddit", "imgur"];
	var val = 0;

	var urls = {
		reddit: "reddit.com",
		imgur: "imgur.com"
	};

	var images = {
		reddit: "",
		imgur: "images/imgur.png"
	};

	var expanded = false;

	var history = [];
	history.push("http://reddit.com/");
	var history_index = 0;

	return {
		setup: function ()
		{
			var outside = this;

			$links.back.click(function ()
			{
				if (history_index > 0)
				{
					$iframe.attr("src", history[--history_index]);
				}
			});

			$links.toggle.click(function ()
			{
				expanded = !expanded;
				outside.updateToggle();
				return false;
			});

			$links.mode.click(function ()
			{
				outside.updateMode();
				return false;
			});

			$links.refresh.click(function ()
			{
				//$iframe.attr("src", last_url);
				$iframe.attr("src", $iframe.attr("src"));
				return false;
			});
		},
		updateToggle: function ()
		{
			layoutManager.getLinkSections().each(function (i, el)
			{
				if (expanded == !$(this).hasClass("collapsed"))
				{
					$(".collapse-button", this).click();
				} 
			});
		},
		getLinks: function ()
		{
			return $links;
		},
		getMode: function ()
		{
			return modes[val];
		},
		updateMode: function ()
		{
			$("body").removeClass(this.getMode());
			$("img", $links.mode).attr("src", "http://www.google.com/ig/c/favicons?domain=" + urls[ this.getMode() ]);
			$links.mode.attr("title", "switch to " + this.getMode() + " mode");
			this.toggleMode();
			$links.home.attr("href", "http://" + urls[ this.getMode() ]);
			$iframe.attr("src", "http://" + urls[ this.getMode() ]);
			$("body").addClass(this.getMode());
		},
		toggleMode: function ()
		{
			val = ++val % modes.length;
		}
	}
}());

storageManager.loadData(function()
{
	layoutManager.setup();
	menuManager.setup();
});